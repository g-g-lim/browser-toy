import * as http from './http';
import browser from './browser';


async function main() {
    const { window, renderContent } = browser.window();

    window.show();

    let response = await http.request({ url: 'http://localhost:8888/10', method: 'GET', headers: { 'Accept-Encoding': 'gzip' } });

    renderContent(response.body as string);

    (global as any).win = window;
}

main().catch(console.error);
