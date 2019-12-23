import { Toolbar, ToolbarButton } from "./toolbar";
import { $ } from "./dollar";
import { Widget } from "./widget";
import { EventManager } from "./eventManager";

function newButton(text: string, icon: string) {
    var btn = new ToolbarButton();
    btn.setText(text);
    btn.setIcon(icon);
    return btn;
}
function newSpacer() {
    var span = $.create('span');
    span.style.display = 'inline-block';
    span.style.height = '1px';
    span.style.width = '24px';
    return span;
}
function newPxl8Logo() {
    var logo = $.create('span');
    logo.textContent = "PXL";
    logo.style.paddingLeft = '1em';
    logo.style.paddingRight = '1em';
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

        this.items.import.element.onclick = e => {
            this.eventManager.raise('buttonClick', 'import');
        };
    }

    private initWidget() {
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