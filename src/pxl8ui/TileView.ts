import { $, $$ } from '../dollar';
import { Volatile, coords } from '../util';
import { Site, siteChild } from '../site';
import { Palette, RGBA } from '../gfx/palette';
import { TileData } from '../gfx/TileData';
import { demoNesTile, tileCodecs, TileCodec } from '../gfx/tileCodec';
import { EventManager } from '../eventManager';
import { Widget } from '../widgets/widget';
import { DragLock, DragLockStartingEvent } from '../dragLock';
import { int } from '../math';
import { WidgetMouseEvent, MouseButton } from '../widgets/input';

export interface TileViewEvents {
    commitChanges?: () => void;
    /**
     * Raised if the view is draggable and the use attempts to drag the view.
     * @param dx The number of cells, horizontally, the view has been dragged.
     * @param dy The number of cells, vertically, the view has been dragged.
     */
    viewDragged?: (dx: number, dy: number) => void;
    viewDismissed?: () => void;
}
/** 
 * Tile editing interface component.
 *
 * @remarks
 * To use the component, construct it, initialize it, then site it. To re-use
 * the component, unsite it, re-initialize it, then re-site it. 
 *  
 * Call dispose() if the object is no longer needed and the application is
 * not closing.
 */
export class TileView extends Widget<TileViewEvents>{
    // element: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null = null;
    metrics: Readonly<TileViewMetrics> = defaultMetrics;
    pixels: TileData = defaultTileData;
    palette: Palette = defaultPalette;
    primaryColor = 0;
    secondaryColor = 1;
    draggable = false;
    viewDragging = false;
    viewDragLock: DragLock | null = null;

    /** The color currently being drawn, or null if no draw operation is in progress. */
    private drawColor = null as number | null;
    private lastDrawnPixel = {
        x: 0,
        y: 0,
    };

    private cachedColor: number | null = null;
    private cachedColorStyle: string = 'black';
    
    // private eventManager = new EventManager<TileViewEvents>();
    // public events = this.eventManager.subscriber; 

    constructor() {
        super(true);

        // Todo: solution that does not require every view to have a permanent hook into window->mouseup

        // DOM does not support mouse capture? Stop drawing on any mouse-up ever.
        window.addEventListener('mouseup', () => {
            if (this.isDrawing())
                this.endDrawOperation();
        });
    }


    /** Initializes this element for use. Can be called multiple times if the object is re-used. */
    initialize(metrics: TileViewMetrics) {
        var width = metrics.tileWidth * metrics.pixelWidth;
        var height = metrics.tileHeight * metrics.pixelHeight;
        (this.element as HTMLCanvasElement).width = width;
        (this.element as HTMLCanvasElement).height = height;
        this.element.style.background = 'white';
        this.context = (this.element as HTMLCanvasElement).getContext('2d')!;


        this.metrics = { ...metrics };
        this.pixels = new TileData(this.metrics.tileWidth, this.metrics.tileHeight);
    }

    site(owner: Site) {
        // siteChild(this.element, owner);
        super.site(owner);
        // this.element.addEventListener('mousemove', e => this.onMouseMove(e));
        // this.element.addEventListener('mousedown', e => this.onMouseDown(e));
        // this.element.addEventListener('mouseup', e => this.onMouseUp(e));
        this.subscribeToEvent('mousemove');
        this.subscribeToEvent('mousedown');
        this.subscribeToEvent('mouseup');
        //this.element.addEventListener('oncontextmenu', e => (e.preventDefault(), console.log('ctx'), false));
        this.element.oncontextmenu = () => false;
    }

    isDrawing() { return this.drawColor !== null; }

    makeDraggable() {
        if (!this.draggable) {
            this.draggable = true;
            this.viewDragLock = new DragLock(this);
            this.viewDragLock.events.subscribe({
                dragStarting: (e: MouseEvent, etc: DragLockStartingEvent) => this.beforeMouseDragStart(e, etc),
                dragStart: (x, y) => this.onMouseDragStart(x, y),
                dragTo: (x, y) => this.onMouseDragTo(x, y),
                dragComplete: (x, y) => this.onMouseDragComplete(x, y),
            });
            this.element.classList.add('pxl8-tile-view-draggable');
        }
    }


    onMouseMove(e: MouseEvent) {
        if (this.drawColor !== null) {
            var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);
            var px = Math.floor(x / this.metrics.pixelWidth);
            var py = Math.floor(y / this.metrics.pixelHeight);
            this.updateDrawOperation(px, py);
        }

    }
    onMouseDown(e: WidgetMouseEvent) {
        e.preventDefault();

        var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);
        var iColor = null as number | null;

        // ctrl-shift-left or shift-middle closes the view
        var ctrlShiftLeft = e.ctrlKey && e.shiftKey && e.button === MouseButton.left;
        var shiftMiddle = e.shiftKey && e.button === MouseButton.middle;
        if (shiftMiddle || ctrlShiftLeft) {
            this.raise('viewDismissed');
            return;
        }
            
        // ctrl is used to drag the view
        if (e.ctrlKey) return;

        if (e.button === 0) {
            iColor = this.primaryColor;
        } else if (e.button === 2) {
            iColor = this.secondaryColor;
            // this.redraw();
        }

        if (iColor !== null) {
            var px = Math.floor(x / this.metrics.pixelWidth);
            var py = Math.floor(y / this.metrics.pixelHeight);
            this.beginDrawOperation(iColor, px, py);
        }
    }

 
    onMouseUp(e: MouseEvent) {
        e.preventDefault();
        var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);
        // this.endDrawOperation();
    }

    beforeMouseDragStart(e: WidgetMouseEvent, etc: DragLockStartingEvent) {
        var middle = e.button === MouseButton.middle;
        var ctrlLeft = (e.button === MouseButton.left && e.ctrlKey);
        if (!(middle || ctrlLeft)) etc.cancel = true;

    }
    onMouseDragStart(x: number,y: number) {
        
    }
    onMouseDragTo(x: number,y: number) {
        var dx = Math.floor(x / this.element.offsetWidth);
        var dy = Math.floor(y / this.element.offsetHeight);
        if (dx !== 0 || dy !== 0) {
            this.raise("viewDragged", dx, dy);
        }
    }
    onMouseDragComplete(x: number, y: number) {
        
    }

    private beginDrawOperation(color: number, px: number, py: number) {
        if (this.drawColor != null) {
            this.endDrawOperation();
        }

        this.drawColor = color;
        this.applyDrawnPixel(px, py);
    }

    private updateDrawOperation(px: number, py: number) {
        if (this.drawColor === null) return;
        if (this.lastDrawnPixel.x !== px || this.lastDrawnPixel.y !== py) {
            this.applyDrawnPixel(px, py);
        }
    }

    private endDrawOperation() {
        this.drawColor = null;
        this.raise('commitChanges');
    }

    private applyDrawnPixel(px: number, py: number) {
        var color = this.drawColor!;

        this.lastDrawnPixel.x = px;
        this.lastDrawnPixel.y = py;

        var top = py * this.metrics.pixelWidth;
        var left = px * this.metrics.pixelHeight;
        if (color >= this.palette.length) color = this.palette.length - 1;
        this.context!.fillStyle = this.getCachedColor(color);
        this.context!.fillRect(left, top, this.metrics.pixelWidth, this.metrics.pixelHeight);
    
        this.pixels.setPixel(px, py, color);
        // this.eventManager.raise("commitChanges");
        // this.raise('commitChanges');
    }

    private getCachedColor(color: number) {
        if (this.cachedColor !== color) {
            this.cachedColor = color;
            this.cachedColorStyle = RGBA.toStyle(this.palette[color]);
        }

        return this.cachedColorStyle;
    }

    /** Rerenders the tile image based on this object's pixel data. Call when pixel data or palette changes. */
    redraw() {
        var { tileWidth, tileHeight, pixelWidth: pw, pixelHeight: ph } = this.metrics;
        var iPxl = 0;
        var data = this.pixels.data;
        var pal = this.palette;

        for (var y = 0; y < tileHeight; y++){
            for (var x = 0; x < tileWidth; x++) {
                var iColor = data[iPxl];
                if (iColor >= pal.length) iColor = pal.length - 1;
                var color = this.palette[iColor];

                iPxl++;
                // super-efficient
                var colorStr = RGBA.toStyle(color);
                // console.log(colorStr);
                // var colorStr = '#' + 
                //     (color.r.toString(16) as any).padStart(2,'0') + 
                //     (color.g.toString(16) as any).padStart(2,'0') + 
                //     (color.b.toString(16) as any).padStart(2,'0') + 
                //     (color.a.toString(16) as any).padStart(2, '0');
                // console.log(colorStr);
                this.context!.fillStyle = colorStr;
                this.context!.fillRect(x * pw, y * ph, pw, ph);
            }
        }
    }

    dispose() {
    }
}
Widget.setElementType(TileView, 'canvas', 'pxl8-tile-view');


export interface TileViewMetrics {
    tileWidth: number;
    tileHeight: number;
    pixelWidth: number;
    pixelHeight: number;
}


const defaultMetrics:TileViewMetrics = {
    tileWidth: 16,
    tileHeight: 16,
    pixelWidth: 1,
    pixelHeight: 1,
}
const defaultTileData = new TileData(16, 16);
const defaultPalette = [
    { r: 0x00, g: 0x00, b: 0x00, a: 0xFF }, // black
    { r: 0xFF, g: 0xFF, b: 0xFF, a: 0xFF }, // white
    { r: 0x00, g: 0x00, b: 0xFF, a: 0xFF }, // blue
    { r: 0x00, g: 0xFF, b: 0x00, a: 0xFF }, // green
];