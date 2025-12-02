import { Key, QKeyEvent, QLabel, QMainWindow, QResizeEvent, QWheelEvent, QWidget, TextFormat, WidgetEventTypes } from "@nodegui/nodegui";

const window = () => {
    const window = new QMainWindow();
    window.setWindowTitle("browser");

    let windowWidth = 800;
    let windowHeight = 600;

    window.resize(windowWidth, windowHeight);

    const rootView = new QWidget();
    rootView.setObjectName("myroot");

    let scrollY = 0;
    let scrollStep = 15;
    let displayList: { x: number, y: number, text: string }[] = [];
    let cursorY = 0;
    let displayHeight = 0;

    const handleScroll = (isDown: boolean) => {
        if (isDown) {
            if (scrollY < 0) {
                scrollY += scrollStep;
                renderContent();
            }
        } else {
            if (displayHeight - windowHeight > -scrollY) {
                scrollY -= scrollStep;
                renderContent();
            }
        }
    }

    window.setCentralWidget(rootView);
    window.addEventListener(WidgetEventTypes.KeyPress, (event) => {
        if (!event) {
            return;
        }
        const keyEvent = new QKeyEvent(event);
        const key = keyEvent.key();
        if ([Key.Key_Down, Key.Key_Up].includes(key)) {
            keyEvent.accept();
            handleScroll(key === Key.Key_Down);
        }
    });
    window.addEventListener(WidgetEventTypes.Wheel, (event) => {
        if (!event) {
            return;
        }
        const wheelEvent = new QWheelEvent(event);
        handleScroll(wheelEvent.angleDelta().y > 0);
    });
    window.addEventListener(WidgetEventTypes.Resize, (event) => {
        if (!event) {
            return;
        }
        const resizeEvent = new QResizeEvent(event);
        resizeEvent.accept();
        const newSize = resizeEvent.size();
        const newWidth = newSize.width();
        const newHeight = newSize.height();
        windowWidth = newWidth;
        windowHeight = newHeight;
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

    const renderContent = (data?: string) => {
        data?.split('\n').forEach((line) => {
            displayList.push({ x: 0, y: cursorY, text: line });
            cursorY += scrollStep;
        });
        displayHeight = cursorY;
        clearWidgets();
        displayList.forEach(({ x, y, text }) => {
            if (y + scrollY < 0 || y + scrollY > windowHeight) {
                return;
            }
            renderText(text, x, y + scrollY);
        });
    }

    return { window, renderContent };
}


export default { window };

