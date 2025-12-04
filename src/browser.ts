import { Key, Orientation, QKeyEvent, QLabel, QMainWindow, QPixmap, QResizeEvent, QScreen, QScrollBar, QWheelEvent, QWidget, TextFormat, WidgetEventTypes } from "@nodegui/nodegui";

let scrollY = 0;
let scrollStep = 15;
let displayList: { x: number, y: number, content: string, type: 'image' | 'text' }[] = [];
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

const scrollbarWidget = (windowHeight: number) => {
    const scrollbar = new QScrollBar();
    scrollbar.setObjectName("scrollbar");
    scrollbar.setOrientation(Orientation.Vertical);
    scrollbar.resize(15, windowHeight);
    scrollbar.setMinimum(0);
    scrollbar.setMaximum(windowHeight);
    return scrollbar;
}

const renderImage = (parentWidget: QWidget, image: string, x: number, y: number) => {
    const imageWidget = new QLabel();
    imageWidget.setObjectName("image");
    const pixmap = new QPixmap();
    const loaded = pixmap.load(image);

    if (!loaded) {
        console.error(`Failed to load image: ${image}`);
        return imageWidget;
    }

    imageWidget.setPixmap(pixmap);
    imageWidget.resize(pixmap.width(), pixmap.height());
    render(parentWidget, imageWidget, x, y);
    return imageWidget;
}

const window = () => {
    const window = new QMainWindow();
    window.setWindowTitle("browser");
    window.resize(windowWidth, windowHeight);
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

    const rootView = new QWidget();
    rootView.setObjectName("myroot");
    window.setCentralWidget(rootView);

    const scrollbar = scrollbarWidget(windowHeight);
    scrollbar.addEventListener('valueChanged', (scrollPosition) => {
        scrollY = -scrollPosition;
        renderContent();
    });
    const handleScroll = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            scrollY = Math.min(0, scrollY + scrollStep);
        } else {
            scrollY = Math.max(windowHeight - contentHeight, scrollY - scrollStep);
        }
        scrollbar.setValue(-scrollY);
        renderContent();
    }

    const renderContent = (data?: { type: 'text' | 'image', content: string }[]) => {
        data?.forEach(({ type, content }) => {
            displayList.push({ x: 0, y: cursorY, content, type });
            cursorY += scrollStep;
        });

        contentHeight = cursorY;
        if (contentHeight >= windowHeight) {
            render(rootView, scrollbar, windowWidth - scrollbar.width(), 0);
            scrollbar.setMaximum(Math.max(contentHeight - windowHeight, 0));
        }

        rootView.children().forEach((child) => {
            if (child.objectName() === "label" || child.objectName() === "image") {
                child.delete();
            }
        });

        displayList.forEach(({ x, y, content, type }) => {
            if (y + scrollY < 0 || y + scrollY > windowHeight) {
                return;
            }
            if (type === 'text') {
                renderText(rootView, content, x, y + scrollY);
            } else {
                renderImage(rootView, content, x, y + scrollY);
            }
        });
    }

    return { window, renderContent };
}


export default { window };

