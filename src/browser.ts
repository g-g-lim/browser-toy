import * as fx from "@fxts/core";
import {
    AlignmentFlag,
    Key,
    Orientation,
    QFont,
    QFontMetrics,
    QKeyEvent,
    QLabel,
    QMainWindow,
    QPixmap,
    QResizeEvent,
    QScrollBar,
    QWheelEvent,
    QWidget,
    TextFormat,
    WidgetEventTypes
} from "@nodegui/nodegui";

let SCROLL_Y = 0;
let SCROLL_STEP = 15;
let DISPLAY_LIST: { content: string, type: 'image' | 'text' }[] = [];
let CONTENT_HEIGHT = 0;
let WINDOW_WIDTH = 800;
let WINDOW_HEIGHT = 400;

const render = (parentWidget: QWidget, widget: QWidget, x: number, y: number) => {
    widget.setParent(parentWidget);
    widget.move(x, y);
    widget.show();
}

const renderText = (parentWidget: QWidget, font: QFont, text: string, x: number, y: number,) => {
    const label = new QLabel();
    label.setObjectName("label");
    label.setText(text);
    label.setTextFormat(TextFormat.PlainText);
    label.setFont(font);
    label.setAlignment(AlignmentFlag.AlignLeft | AlignmentFlag.AlignTop);
    label.adjustSize();
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
    window.resize(WINDOW_WIDTH, WINDOW_HEIGHT);
    window.addEventListener(WidgetEventTypes.KeyPress, (event) => {
        if (!event || CONTENT_HEIGHT < WINDOW_HEIGHT) {
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
        if (!event || CONTENT_HEIGHT < WINDOW_HEIGHT) {
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
        WINDOW_WIDTH = newWidth;
        WINDOW_HEIGHT = newHeight;

        scrollbar.resize(scrollbar.width(), WINDOW_HEIGHT);
        if (CONTENT_HEIGHT >= WINDOW_HEIGHT) {
            render(rootView, scrollbar, WINDOW_WIDTH - scrollbar.width(), 0);
        }

        renderContent();
    });

    const rootView = new QWidget();
    rootView.setObjectName("myroot");
    window.setCentralWidget(rootView);

    const scrollbar = scrollbarWidget(WINDOW_HEIGHT);
    scrollbar.addEventListener('valueChanged', (scrollPosition) => {
        SCROLL_Y = -scrollPosition;
        renderContent();
    });
    const handleScroll = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            SCROLL_Y = Math.min(0, SCROLL_Y + SCROLL_STEP);
        } else {
            SCROLL_Y = Math.max(WINDOW_HEIGHT - CONTENT_HEIGHT, SCROLL_Y - SCROLL_STEP);
        }
        scrollbar.setValue(-SCROLL_Y);
        renderContent();
    }

    const font = new QFont("Helvetica", 16);
    const metrics = new QFontMetrics(font);
    SCROLL_STEP = metrics.lineSpacing();

    const renderContent = (data?: { type: 'text' | 'image', content: string }[]) => {
        if (data) {
            DISPLAY_LIST.push(...data);
        }

        rootView.children().forEach((child) => {
            if (child.objectName() === "label" || child.objectName() === "image") {
                child.delete();
            }
        });

        let x = 0;
        let y = 0;
        let spaceWidth = metrics.horizontalAdvance(' ');

        fx.pipe(
            DISPLAY_LIST,
            fx.filter(({ type }) => type === 'text'),
            fx.flatMap(({ content }) => content.split(' ')),
            fx.map((word) => {
                const temp = { word, x, y };
                const wordWidth = metrics.horizontalAdvance(word) + spaceWidth;
                x += wordWidth;
                if (x > WINDOW_WIDTH - wordWidth) {
                    x = 0;
                    y += metrics.height() * 1.25;
                }
                return temp;
            }),
            fx.filter(({ y }) => y + SCROLL_Y >= 0 && y + SCROLL_Y < WINDOW_HEIGHT),
            fx.each(({ word, x, y }) => {
                renderText(rootView, font, word, x, y + SCROLL_Y)
            })
        )

        CONTENT_HEIGHT = y;
        if (CONTENT_HEIGHT >= WINDOW_HEIGHT) {
            render(rootView, scrollbar, WINDOW_WIDTH - scrollbar.width(), 0);
            scrollbar.setMaximum(Math.max(CONTENT_HEIGHT - WINDOW_HEIGHT, 0));
        }
    }

    return { window, renderContent };
}


export default { window };

