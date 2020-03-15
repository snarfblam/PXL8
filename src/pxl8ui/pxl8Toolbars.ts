import { Toolbar, ToolbarButton, ToolbarSize, ToolbarLabel, ToolbarEvents } from "../widgets/toolbar";
import { $ } from "../dollar";
import { Widget } from "../widgets/widget";
import { EventManager } from "../eventManager";
import { MiniPaletteView } from "../paletteView";
import { ViewUnit } from "./romView";
import { Direction } from "../util";

// function newButton(text: string, icon: string) {
//     var btn = new ToolbarButton();
//     btn.setText(text);
//     btn.setIcon(icon);
//     return btn;
// }
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

export type Pxl8ToolbarButton = 'import' | 'export' | 'copy' | 'paste' | 'zoomin' | 'zoomout' | 'help' | 'menu';


export class Pxl8Toolbar extends Toolbar<Pxl8ToolbarButton> {
    constructor() {
        super(true);

        this.initWidget();
    }

    private addClickHandler(btn: ToolbarButton, name: Pxl8ToolbarButton) {
        btn.element.onclick = e => this.raise('buttonClicked', name);
    }

    private initWidget() {
        this.setSize(ToolbarSize.large);

        this.element.append(newPxl8Logo());
        this.addButton("import", "Import", "import.png");
        this.addButton("export", "Export", "export.png");
        this.addSpace();
        this.addButton("copy", "Copy", "copy.png");
        this.addButton("paste", "Paste", "paste.png");
        this.addSpace();
        this.addButton("zoomout", "Zoom In", "zoomin.png");
        this.addButton("zoomin", "Zoom Out", "zoomout.png");
        this.addSpace();
        this.addButton("menu", "Menu", "tiles.png");
        this.addButton("help", "Help", "help.png");
    }
}

type StatusBarButtons = 'tileUp' | 'tileDown' | 'byteUp' | 'byteDown';
interface ScrollNotificationEvents {
    scroll?: (unit: ViewUnit, dir: Direction.up | Direction.down) => void;
}
export type Pxl8StatusbarEvents = ToolbarEvents<StatusBarButtons> & ScrollNotificationEvents;

export class Pxl8StatusBar extends Toolbar<StatusBarButtons, Pxl8StatusbarEvents> {
    private readonly palView = new MiniPaletteView();
    private readonly offsetLabel = new ToolbarLabel();

    constructor() {
        super(true);

        this.initWidget();
        this.palView.site({ site: this.element });
        this.offsetLabel.site(this);

        this.setOffsetValue(-1);

        this.on({ 'buttonClicked': e => this.onButtonClicked(e) });
    }

    private initWidget() {
        this.addButton('tileUp', "Tile", "small_up.png");
        this.addButton('byteUp', "Byte", "small_up.png");
        this.addButton('tileDown', "Tile", "small_down.png");
        this.addButton('byteDown', "Byte", "small_down.png");
    }

    private onButtonClicked(btn: StatusBarButtons) {
        if (btn === 'tileUp') {
            this.raise("scroll", ViewUnit.tile, Direction.up);
        }else if (btn === 'tileDown') {
            this.raise("scroll", ViewUnit.tile, Direction.down);
        }else if (btn === 'byteUp') {
            this.raise("scroll", ViewUnit.byte, Direction.up);
        }else if (btn === 'byteDown') {
            this.raise("scroll", ViewUnit.byte, Direction.down);
        }
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