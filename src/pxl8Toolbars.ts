import { Toolbar, ToolbarButton, ToolbarSize, ToolbarLabel } from "./toolbar";
import { $ } from "./dollar";
import { Widget } from "./widget";
import { EventManager } from "./eventManager";
import { MiniPaletteView } from "./paletteView";

function newButton(text: string, icon: string) {
    var btn = new ToolbarButton();
    btn.setText(text);
    btn.setIcon(icon);
    return btn;
}
function newSpacer(size?: number) {
    size = size || 24;
    var span = $.create('span');
    span.style.display = 'inline-block';
    span.style.height = '1px';
    span.style.width = size.toString() + "px";
    return span;
}
function newPxl8Logo() {
    var logo = $.create('span');
    logo.textContent = "PXL";
    logo.style.paddingLeft = '16px';
    logo.style.paddingRight = '32px';
    logo.style.fontSize = '50px';
    logo.style.fontFamily = 'consolas, sans-serif';
    logo.style.position = 'relative';
    logo.style.top = '-4px';
    logo.style.color = '#AAAAAA';

    var eight = $.create('span');
    eight.textContent = '8';
    eight.style.color = '#AA5555';
    logo.appendChild(eight);

    return logo;
}

export type Pxl8ToolbarButton = 'import' | 'export' | 'copy' | 'paste' | 'zoomin' | 'zoomout';

export interface Pxl8ToolbarEvents {
    buttonClick?: (name: Pxl8ToolbarButton) => void;
}

export class Pxl8Toolbar extends Toolbar {
    private items = {
        import: newButton("Import", "import.png"),
        export: newButton("Export", "export.png"),
        copy: newButton("Copy", "copy.png"),
        paste: newButton("Paste", "paste.png"),
        zoomIn: newButton("Zoom In", "zoomin.png"),
        zoomOut: newButton("Zoom Out", "zoomout.png"),
    };
    private eventManager = new EventManager<Pxl8ToolbarEvents>();
    public events = this.eventManager.subscriber;

    constructor() {
        super();

        this.initWidget();

        this.addClickHandler(this.items.import, 'import');
        this.addClickHandler(this.items.export, 'export');
        this.addClickHandler(this.items.copy, 'copy');
        this.addClickHandler(this.items.paste, 'paste');
        this.addClickHandler(this.items.zoomIn, 'zoomin');
        this.addClickHandler(this.items.zoomOut, 'zoomout');
    }

    private addClickHandler(btn: ToolbarButton, name: Pxl8ToolbarButton) {
        btn.element.onclick = e => this.eventManager.raise('buttonClick', name);
    }

    private initWidget() {
        this.setSize(ToolbarSize.large);

        var itemList = [
            newPxl8Logo(),
            this.items.import,
            this.items.export,
            newSpacer(),
            this.items.copy,
            this.items.paste,
            newSpacer(),
            this.items.zoomIn,
            this.items.zoomOut,
        ];

        itemList.forEach(item => {
            if (item instanceof Widget) {
                item.site(this);
            } else {
                this.element.appendChild(item);
            }
        });
    }
}

export class Pxl8StatusBar extends Toolbar {
    private readonly items = {
        tileUp: newButton("Tile", "small_up.png"),
        byteUp: newButton("Byte", "small_up.png"),
        tileDown: newButton("Tile", "small_down.png"),
        byteDown: newButton("Byte", "small_down.png"),
    };
    private readonly palView = new MiniPaletteView();
    private readonly offsetLabel = new ToolbarLabel();

    private readonly eventManager = new EventManager<Pxl8ToolbarEvents>();
    public readonly events = this.eventManager.subscriber;
    
    constructor() {
        super();

        this.initWidget();
        this.palView.site({ site: this.element });
        this.offsetLabel.site(this);

        this.setOffsetValue(-1);
    }

    private initWidget() {
        var itemList = [
            newSpacer(),
            this.items.tileUp,
            this.items.byteUp,
            this.items.tileDown,
            this.items.byteDown,
        ];

        itemList.forEach(item => {
            if (item instanceof Widget) {
                item.site(this);
            } else {
                this.element.appendChild(item);
            }
        });

        this.palView.element.style.display = 'inline-block';
        this.palView.element.style.verticalAlign = 'middle';
        this.palView.element.style.marginLeft = '24px';
    }

    public getPaletteView() { return this.palView; }

    protected createElement() {
        var elem = super.createElement();
        elem.style.background = '#EEEEEE';
        elem.style.boxShadow = '0 -1px #00000033';
        return elem;
    }

    setOffsetValue(offset: number) {
        var text = (offset < 0) ?
            "No ROM Loaded" :
            "Offset: $" + offset.toString(16).toUpperCase();
        this.offsetLabel.setText(text);
    }
}