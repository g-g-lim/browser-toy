import { Key, QKeyEvent, QLabel, QMainWindow, QResizeEvent, QWheelEvent, QWidget, TextFormat, WidgetEventTypes, QFontMetrics, QFont } from "@nodegui/nodegui";

const window = () => {
    const window = new QMainWindow();
    window.setWindowTitle("browser");

    let windowWidth = 300;
    let windowHeight = 200;

    window.resize(windowWidth, windowHeight);

    let scrollX = 0;
    let scrollY = 0;
    let scrollStep = 15

    const rootView = new QWidget();
    rootView.setObjectName("myroot");

    window.setCentralWidget(rootView);
    window.addEventListener(WidgetEventTypes.KeyPress, (event) => {
        if (!event) {
            return;
        }
        const keyEvent = new QKeyEvent(event);
        const key = keyEvent.key();
        if ([Key.Key_Down, Key.Key_Up, Key.Key_Left, Key.Key_Right].includes(key)) {
            keyEvent.accept();
            if ([Key.Key_Down, Key.Key_Up].includes(key)) {
                scrollY += key === Key.Key_Down ? scrollStep : -scrollStep;
            } else {
                scrollX += key === Key.Key_Right ? scrollStep : -scrollStep;
            }
            renderContent();
        }
    });
    window.addEventListener(WidgetEventTypes.Wheel, (event) => {
        if (!event) {
            return;
        }
        const wheelEvent = new QWheelEvent(event);
        wheelEvent.accept();
        if (wheelEvent.angleDelta().y > 0) {
            scrollY += scrollStep;
            renderContent();
        } else {
            scrollY -= scrollStep;
            renderContent();
        }
        if (wheelEvent.angleDelta().x > 0) {
            scrollX += scrollStep;
            renderContent();
        } else {
            scrollX -= scrollStep;
            renderContent();
        }
    });
    window.addEventListener(WidgetEventTypes.Resize, (event) => {
        if (!event) {
            return;
        }
        const resizeEvent = new QResizeEvent(event);
        resizeEvent.accept();
        const newSize = resizeEvent.size();
        windowWidth = newSize.width();
        windowHeight = newSize.height();
        renderContent();
    });

    const render = (widget: QWidget, x: number, y: number) => {
        widget.setParent(rootView);
        widget.move(x, y);
        widget.show();
    }

    const renderText = (text: string, x: number, y: number) => {
        const label = new QLabel();
        label.setText(text);
        label.setTextFormat(TextFormat.PlainText);
        render(label, x, y);
        return label;
    }

    const clearWidgets = () => {
        rootView.children().forEach((child) => {
            child.delete();
        });
    }

    let displayList: { x: number, y: number, text: string }[] = [];
    let cursorX = 0;
    let cursorY = 0;

    const font = new QFont();
    const metrics = new QFontMetrics(font);
    const height = metrics.height();

    const renderContent = (data?: string) => {
        data?.split('\n').forEach((line) => {
            line.split('').forEach((char) => {
                displayList.push({ x: cursorX, y: cursorY, text: char });
                cursorX += metrics.horizontalAdvance(char);
            });
            cursorX = 0;
            cursorY += height;
        });
        clearWidgets();
        displayList.forEach(({ x, y, text }) => {
            if (y + scrollY < 0 || y + scrollY > windowHeight) {
                return;
            }
            if (x + scrollX < 0 || x + scrollX > windowWidth) {
                return;
            }
            renderText(text, x + scrollX, y + scrollY);
        });
    }

    return { window, renderContent };
}


export default { window };

