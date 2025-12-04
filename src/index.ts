import * as http from './http';
import browser from './browser';
import * as util from './util';

async function main() {
    const { window, renderContent } = browser.window();

    window.show();

    let response = await http.request({ url: 'https://localhost:8888', method: 'GET' });

    renderContent((response.body as string).split('\n').map((line) => ({ type: 'text', content: line })));
    renderContent([{ type: 'image', content: './src/emoji/1F9CB.png' }]);

    (global as any).win = window;
}

main().catch(console.error);
