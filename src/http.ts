import { connect as tlsConnect, TLSSocket } from 'node:tls';
import { StringDecoder } from "string_decoder";
import * as util from './util';
import { unzip } from 'node:zlib';
import { promisify } from 'node:util';
const do_unzip = promisify(unzip);

const connection: { [key: string]: TLSSocket } = {}

const connect = (host: string, port: string) => {
    if (connection[host + ':' + port]) {
        const conn = connection[host + ':' + port];
        if (conn.destroyed) {
            delete connection[host + ':' + port];
        } else {
            return conn;
        }
    }

    const socket = tlsConnect({
        host: host,
        port: parseInt(port),
        rejectUnauthorized: false // for development
    }, () => {
        console.log("TLS connected");
    });
    socket.on('error', (error) => {
        if (error.code !== 'ABORT_ERR') {
            console.error(error);
        }
    });
    socket.on('end', () => {
        console.log("disconnected");
    });
    socket.on('close', () => {
        console.log("closed");
    });

    connection[host + ':' + port] = socket;
    return socket;
}

interface HttpStatus {
    code: number;
    message: string;
    version: string;
}

const parseStatusLine = (statusLine: string): HttpStatus => {
    const [version, code] = statusLine.split(' ');
    const message = statusLine.slice(version.length + code.length + 2);
    return { version, code: parseInt(code), message };
}

const parseHeader = (data: string) => {
    const header = data.split('\r\n');
    const statusLine = header[0];
    const headerLines = header.slice(1);
    const headers: { [key: string]: string } = {};
    for (const line of headerLines) {
        const [key, value] = line.split(': ');
        headers[key] = value;
    }
    return { statusLine, headers };
}

const parseBody = (contentType: string, data: Buffer) => {
    const decoder = new StringDecoder("utf8");
    const body = decoder.write(data) + decoder.end();
    if (contentType === 'text/plain') {
        return body;
    } else if (contentType === 'application/json') {
        return JSON.parse(body);
    }
    return body;
}

interface Response {
    status: HttpStatus;
    headers: { [key: string]: any };
    body: string | object;
}

const parseUrl = (url: string) => {
    let [protocol, rest] = url.split('://');
    if (!rest.includes('/')) {
        rest += '/';
    }
    const pathIdx = rest.indexOf('/');
    const address = rest.slice(0, pathIdx);
    const path = rest.slice(pathIdx);
    let [host, port] = address.split(':');
    if (!port) {
        port = protocol === 'https' ? '443' : '80';
    }
    return { protocol, host, port, path };
}

interface RequestOptions {
    url: string;
    method: string;
    headers?: { [key: string]: string };
}

const request = (options: RequestOptions) => {
    if (!options.headers) {
        options.headers = {};
    }

    let { protocol, host, port, path } = parseUrl(options.url);

    const socket = connect(host, port);

    const version = 'HTTP/1.1';
    const headersList = Object.entries(options.headers).map(([key, value]) => `${key}: ${value}`);

    socket.write(`${options.method} ${path} ${version}\r\nHost: ${host}:${port}\r\n${headersList.join('\r\n')}\r\n\r\n`);

    return new Promise<Response>((resolve, reject) => {
        let buffer = Buffer.alloc(0);
        let status: HttpStatus | undefined = undefined;
        let headers: Response['headers'] | undefined = undefined;
        let headerEnd = 0;
        let bodyStart = 0;
        let contentLength = 0;

        const onData = (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);

            if (!status || !headers) {
                headerEnd = buffer.indexOf("\r\n\r\n");
                if (headerEnd === -1) {
                    return;
                }

                const headerBuffer = util.copySlice(buffer, 0, headerEnd);
                const parsedHeader = parseHeader(headerBuffer.toString('ascii'));

                status = parseStatusLine(parsedHeader.statusLine);
                headers = parsedHeader.headers;

                if (status.code === 301) {
                    const location = headers['Location'];
                    if (location) {
                        cleanup();
                        request({ url: location, method: options.method, headers: options.headers }).then(resolve);
                        return;
                    }
                }

                if (status.code >= 400) {
                    console.error(`${status.code} ${status.message}`);
                    cleanup();
                    resolve({ status, headers: parsedHeader.headers, body: status.message });
                    return;
                }

                bodyStart = headerEnd + 4;
                contentLength = parseInt(headers['Content-Length'] || '0');

            }

            if (bodyStart + contentLength <= buffer.length) {
                if (headers['Content-Encoding'] === 'gzip') {
                    do_unzip(util.copySlice(buffer, bodyStart, bodyStart + contentLength)).then((bodyBuffer) => {
                        const body = parseBody(headers?.['Content-Type'], bodyBuffer);
                        cleanup();
                        resolve({ status: status!, headers: headers!, body });
                    });
                } else {
                    const bodyBuffer = util.copySlice(buffer, bodyStart, bodyStart + contentLength);
                    const body = parseBody(headers['Content-Type'], bodyBuffer);
                    cleanup();
                    resolve({ status, headers, body });
                }

                if (buffer.length > bodyStart + contentLength) {
                    const extra = util.copySlice(buffer, bodyStart + contentLength, buffer.length);
                    socket.unshift(extra);
                }
            }
        };

        const cleanup = () => {
            socket.off('data', onData);
            socket.off('error', onError);
        };

        const onError = (err: Error) => {
            cleanup();
            reject(err);
        };

        socket.on('data', onData);
        socket.once('error', onError);
    });
}

export { request };
