import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { IncomingMessage, ServerResponse } from 'node:http';
import { gzipSync } from 'node:zlib';

const keyPath = join(cwd(), 'certs/server-key.pem');
const certPath = join(cwd(), 'certs/server-cert.pem');

let key: Buffer;
let cert: Buffer;

try {
    key = readFileSync(keyPath);
    cert = readFileSync(certPath);
} catch (error) {
    console.error('Not found certificates. Run `npm run gen-cert`');
    process.exit(1);
}

const server = createServer({
    key: key,
    cert: cert
});

server.listen(8888, 'localhost', () => {
    console.log('Server is running on https://localhost:8888');
});
server.on('connection', (socket) => {
    console.log('New connection');
});
server.on('disconnect', () => {
    console.log('Disconnected');
});
server.on('error', (error) => {
    console.error(error);
});
server.on('close', () => {
    console.log('Server closed');
});

interface HandlerResult {
    status: number;
    body: string;
    headers: { [key: string]: string };
}

const router: { [key: string]: (request: IncomingMessage) => HandlerResult } = {
    '/': (request: IncomingMessage) => {
        let body = '';
        for (let i = 0; i < 100; i++) {
            body += `{${i}} ${'Hello world!'.repeat(1000)}\n`;
        }
        return { status: 200, body, headers: { 'Content-Type': 'text/plain' } };
    },
    '/json': (request: IncomingMessage) => {
        const body = JSON.stringify({ message: 'Hello world!' });
        return { status: 200, body, headers: { 'Content-Type': 'application/json' } };
    },
    '/html': (request: IncomingMessage) => {
        const body = `<html>
    <head>
        <title>Hello world!</title>
    </head>
    <body>
        <h1>Hello world!</h1>
    </body>
</html>
        `;
        return { status: 200, body, headers: { 'Content-Type': 'text/html' } };
    }
}

const logRequest = (request: IncomingMessage) => {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
    console.log(request.headers);
}

server.on('request', (request, response) => {
    logRequest(request);
    const handler = router[request.url!];
    if (handler) {
        const data = handler(request);
        const acceptEncoding = request.headers['accept-encoding'] || '';
        if (acceptEncoding.includes('gzip')) {
            const compressed = gzipSync(data.body);
            response.writeHead(data.status, {
                'Content-Encoding': 'gzip',
                'Content-Length': compressed.length
            });
            response.end(compressed);
        } else {
            response.writeHead(data.status, { 'Content-Length': Buffer.byteLength(data.body) });
            response.end(data.body);
        }
    } else {
        response.writeHead(404, { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength('Not found') });
        response.end('Not found');
    }
});