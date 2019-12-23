import { $, $$ } from './dollar';
import { Palette, ManagedPalette, RGBA } from './gfx/palette';
import { Site, siteChild, Siteable } from './site';
import { EventManager } from './eventManager';

function createElem(tag: string, x: number, y: number, w: number, h: number, color?: string) {
    var result = $.create(tag);
    result.style.position = 'absolute';
    result.style.left = x + 'px';
    result.style.top = y + 'px';
    result.style.width = w + 'px';
    result.style.height = h + 'px';
    if (color) result.style.backgroundColor = color;
    return result;
}

function setBounds(element: HTMLElement, x: number, y: number, w: number, h: number) {
    element.style.position = 'absolute';
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    element.style.width = w + 'px';
    element.style.height = h + 'px';
}

const metrics = {
    palette: {
        width: 240,
        height: 60,
    }
}

const defaultPalette = [
    { r: 0, g: 0, b: 0, a: 255 },
    { r: 255, g: 0, b: 0, a: 255 },
    { r: 0, g: 255, b: 0, a: 255 },
    { r: 0, g: 0, b: 255, a: 255 },
];

export interface PaletteViewEvents {
    paletteModified?: () => void;
    colorSelected?: () => void;
}

export class PaletteView {
    private rgbDetents = 8;
    private palette = new ManagedPalette(defaultPalette);
    private primarySelection = 0;
    private secondarySelection = 1;
    
    private eventManager = new EventManager<PaletteViewEvents>();
    public events = this.eventManager.subscriber;

    private ui = {
        element: createElem('div', 0, 0, 360, 120),
        selectionBox: {
            element: createElem('div', 0, 0, 120, 120, '#777'),
            secondary: { element: createElem('div', 40, 40, 80, 80, '#444') },
            primary: { element: createElem('div', 0, 0, 80, 80, '#888'), },
        },
        palettePanes: {
            element: createElem('div', 120, 0, 240, 60, 'blue'),
            children: [] as HTMLElement[],
        },
        rgbPanes: {
            element: createElem('div', 120, 60, 240, 60, 'red'),
            r: {
                element: createElem('div', 0, 0, 240, 20, '#880000'),
                children: [] as HTMLElement[],
            },
            g: {
                element: createElem('div', 0, 20, 240, 20, '#008800'),
                children: [] as HTMLElement[],
            },
            b: {
                element: createElem('div', 0, 40, 240, 20, '#000088'),
                children: [] as HTMLElement[],
            },
        },
    };
    readonly element = this.ui.element;

    constructor() {
        this.createComponents();  
        this.updatePrimarySwatch();
        this.updateSecondarySwatch();

        this.ui.palettePanes.element.onmousedown = e => this.onPalMouseDown(e);
        this.ui.rgbPanes.element.onmousedown = e => this.onRgbMouseDown(e);
        this.ui.element.oncontextmenu = e => e.preventDefault();
    }

    site(site: Site) {
        siteChild(this.ui.element, site);
    }

    setPalette(palette: RGBA[]) {
        this.palette.resize(palette.length);
        for (var i = 0; i < palette.length; i++){
            this.palette.setColor(i, palette[i]);
        }

        this.updateSwatchGrid();
        this.updatePrimarySwatch();
        this.updateSecondarySwatch();
    }

    getPalette() {
        return this.palette.cloneColors();
    }

    updatePrimarySwatch() {
        var colorStyle = this.palette.getStyle(this.primarySelection);
        this.ui.selectionBox.primary.element.style.backgroundColor = colorStyle;
    }

    updateSecondarySwatch() {
        var colorStyle = this.palette.getStyle(this.secondarySelection);
        this.ui.selectionBox.secondary.element.style.backgroundColor = colorStyle;
    }

    onPalMouseDown(e: MouseEvent) {
        var palIndex = this.ui.palettePanes.children.indexOf(e.target as HTMLElement);
        if (palIndex >= 0) console.log(palIndex);

        if (e.button === 0) {
            this.primarySelection = palIndex;
            this.updatePrimarySwatch();
        } else if (e.button === 2) {
            this.secondarySelection = palIndex;
            this.updateSecondarySwatch();
        } else {
            return; // Don't raise event
        } 
        
        this.eventManager.raise('colorSelected', undefined);
    }
    onRgbMouseDown(e: MouseEvent) {
        // What was clicked?
        var rIndex = this.ui.rgbPanes.r.children.indexOf(e.target as HTMLElement);
        var gIndex = this.ui.rgbPanes.g.children.indexOf(e.target as HTMLElement);
        var bIndex = this.ui.rgbPanes.b.children.indexOf(e.target as HTMLElement);
        var intensity = 255 * Math.max(rIndex, gIndex, bIndex) / (this.rgbDetents - 1); // get value in [0...255] range

        var secondary = e.button === 2;
        var palIndex = secondary ? this.secondarySelection : this.primarySelection;
        var color = this.palette.getColor(palIndex);
        var { r, g, b, a } = color;
        var newColor = { r, g, b, a };

        if (rIndex >= 0) newColor.r = intensity;
        if (gIndex >= 0) newColor.g = intensity;
        if (bIndex >= 0) newColor.b = intensity;

        this.palette.setColor(palIndex, newColor);
        this.updatePaletteColors();
        this.eventManager.raise('paletteModified', undefined);
    }

    private createComponents() {
        this.ui.element.style.position = 'relative';
        this.siteStaticChildren(this.ui);
        this.updateSwatchGrid();
    }

    /** Creates or removes palette swatch according to this object's palette and rgbDetent values.*/
    private updateSwatchGrid() {
        this.createPaletteElements();
        this.createRgbElements();
    }

    private siteStaticChildren(ui: PaletteView["ui"]) {
        // hack: there is no way to cleanly represent 
        // type UiNode = { [name: string]: UiNode, element: HTMLElement } 
        // in Typescript
        var element = ui.element;
        var key: keyof PaletteView["ui"];

        for (key in ui) if (key !== 'element' && key !== 'children' as string) { // bet you didn't know about for...in...if blocks
            var child = ui[key];
            element.appendChild(child.element);
            this.siteStaticChildren(child as any);
        }
    }

    private createPaletteElements() {
        var parent = this.ui.palettePanes.element;
        var elements = this.ui.palettePanes.children;

        while (elements.length > this.palette.getLength()) {
            parent.removeChild(elements.pop()!);
        }
        while (elements.length < this.palette.getLength()) {
            var elem = $.create('div');
            elements.push(elem);
            parent.appendChild(elem);
        }

        const cellWidth = Math.floor(metrics.palette.width / elements.length);
        for (var i = 0; i < elements.length; i++) {
            setBounds(elements[i],
                cellWidth * i, 0,
                cellWidth, metrics.palette.height
            );

            this.updatePaletteColor(i);
        }
    }

    getPrimarySelection() { return this.primarySelection;}
    getSecondarySlection() { return this.secondarySelection;}

    private updatePaletteColors() {
        var count = this.ui.palettePanes.children.length;
        for (var i = 0; i < count; i++){
            this.updatePaletteColor(i);
        }
        this.updatePrimarySwatch();
        this.updateSecondarySwatch();
    }

    private createRgbElements() {
        this.createComponentElements(
            this.ui.rgbPanes.r.element,
            this.ui.rgbPanes.r.children,
            amt => RGBA.toStyle({ r: amt * 255, g: 0, b: 0, a: 255 })
        );
        this.createComponentElements(
            this.ui.rgbPanes.g.element,
            this.ui.rgbPanes.g.children,
            amt => RGBA.toStyle({ r:0, g: amt * 255, b: 0, a: 255 })
        );
        this.createComponentElements(
            this.ui.rgbPanes.b.element,
            this.ui.rgbPanes.b.children,
            amt => RGBA.toStyle({ r: 0, g: 0, b: amt * 255, a: 255 })
        );
        // var rParent = this.ui.rgbPanes.r.element;
        // var gParent = this.ui.rgbPanes.g.element;
        // var bParent = this.ui.rgbPanes.b.element;
        // var rElements = this.ui.rgbPanes.r.children;
        // var gElements = this.ui.rgbPanes.g.children;
        // var bElements = this.ui.rgbPanes.b.children;

        // while (rElements.length > this.rgbDetents) {
        //     parent.removeChild(elements.pop()!);
        // }
        // while (elements.length < this.palette.getLength()) {
        //     var elem = $.create('div');
        //     elements.push(elem);
        //     parent.appendChild(elem);
        // }

        // const cellWidth = Math.floor(metrics.palette.width / elements.length);
        // for (var i = 0; i < elements.length; i++) {
        //     setBounds(elements[i],
        //         cellWidth * i, 0,
        //         cellWidth, metrics.palette.height
        //     );

        //     this.updatePaletteColor(i);
        // }
    }
    private createComponentElements(parent: HTMLElement, children: HTMLElement[], colorizer: (percent: number) => string) {
        while (children.length > this.rgbDetents) {
            parent.removeChild(children.pop()!);
        }
        while (children.length < this.rgbDetents) {
            var elem = $.create('div');
            children.push(elem);
            parent.appendChild(elem);
        }

        const cellWidth = Math.floor(metrics.palette.width / children.length);
        for (var i = 0; i < children.length; i++) {
            setBounds(children[i],
                cellWidth * i, 0,
                cellWidth, metrics.palette.height / 3
            );

            var percent = i / (children.length - 1);
            children[i].style.backgroundColor = colorizer(percent);
        }
    }

    private updatePaletteColor(index: number) {
        this.ui.palettePanes.children[index].style.backgroundColor = this.palette.getStyle(index);
    }

}

