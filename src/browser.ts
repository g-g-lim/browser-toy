import { Key, Orientation, QKeyEvent, QLabel, QMainWindow, QResizeEvent, QScreen, QScrollBar, QWheelEvent, QWidget, TextFormat, WidgetEventTypes } from "@nodegui/nodegui";

let scrollY = 0;
let scrollStep = 15;
let displayList: { x: number, y: number, text: string }[] = [];
let cursorY = 0;
let contentHeight = 0;
let windowWidth = 800;
let windowHeight = 600;

const render = (parentWidget: QWidget, widget: QWidget, x: number, y: number) => {
    widget.setParent(parentWidget);
    widget.move(x, y);
    widget.show();
}

const renderText = (parentWidget: QWidget, text: string, x: number, y: number) => {
    const label = new QLabel();
    label.setObjectName("label");
    label.setText(text);
    label.setTextFormat(TextFormat.PlainText);
    render(parentWidget, label, x, y);
    return label;
}

const scrollbarWidget = (parentWidget: QWidget, windowWidth: number, windowHeight: number) => {
    const scrollbar = new QScrollBar();
    scrollbar.setObjectName("scrollbar");
    scrollbar.setOrientation(Orientation.Vertical);
    scrollbar.resize(15, windowHeight);
    scrollbar.setMinimum(0);
    scrollbar.setMaximum(windowHeight);
    // render(parentWidget, scrollbar, windowWidth - scrollbar.width(), 0);
    return scrollbar;
}

const window = () => {
    const window = new QMainWindow();
    window.setWindowTitle("browser");

    window.resize(windowWidth, windowHeight);

    const rootView = new QWidget();
    rootView.setObjectName("myroot");
    window.setCentralWidget(rootView);

    const scrollbar = scrollbarWidget(rootView, windowWidth, windowHeight);

    scrollbar.addEventListener('valueChanged', (scrollPosition) => {
        scrollY = -scrollPosition;
        renderContent();
    });

    window.addEventListener(WidgetEventTypes.KeyPress, (event) => {
        if (!event || contentHeight < windowHeight) {
            return;
        }
        const keyEvent = new QKeyEvent(event);
        const key = keyEvent.key();
        if ([Key.Key_Down, Key.Key_Up].includes(key)) {
            keyEvent.accept();
            handleScroll(key === Key.Key_Down ? 'down' : 'up');
        }
    });
    window.addEventListener(WidgetEventTypes.Wheel, (event) => {
        if (!event || contentHeight < windowHeight) {
            return;
        }
        const wheelEvent = new QWheelEvent(event);
        handleScroll(wheelEvent.angleDelta().y > 0 ? 'down' : 'up');
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

        scrollbar.resize(scrollbar.width(), windowHeight);
        if (contentHeight >= windowHeight) {
            render(rootView, scrollbar, windowWidth - scrollbar.width(), 0);
        }
    });

    const handleScroll = (direction: 'up' | 'down', step = scrollStep) => {
        if (direction === 'up') {
            scrollY = Math.min(0, scrollY + step);
        } else {
            scrollY = Math.max(windowHeight - contentHeight, scrollY - step);
        }
        scrollbar.setValue(-scrollY);
        renderContent();
    }

    const renderContent = (data?: string) => {
        data?.split('\n').forEach((line) => {
            displayList.push({ x: 0, y: cursorY, text: line });
            cursorY += scrollStep;
        });

        contentHeight = cursorY;
        if (contentHeight >= windowHeight) {
            render(rootView, scrollbar, windowWidth - scrollbar.width(), 0);
            scrollbar.setMaximum(Math.max(contentHeight - windowHeight, 0));
        }

        rootView.children().forEach((child) => {
            if (child.objectName() === "label") {
                child.delete();
            }
        });

        displayList.forEach(({ x, y, text }) => {
            if (y + scrollY < 0 || y + scrollY > windowHeight) {
                return;
            }
            renderText(rootView, text, x, y + scrollY);
        });
    }

    return { window, renderContent };
}


export default { window };

