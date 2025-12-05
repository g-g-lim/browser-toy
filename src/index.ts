import * as http from './http';
import browser from './browser';
import * as util from './util';

async function main() {
    const { window, renderContent } = browser.window();

    window.show();

    let response = await http.request({ url: 'https://localhost:8888', method: 'GET' });

    renderContent([{ type: 'text', content: response.body as string }]);

    (global as any).win = window;
}

main().catch(console.error);
