import { $, $$ } from './dollar';
import { Volatile, coords } from './util';
import { Site } from './site';
import { Palette, RGBA } from './gfx/palette';
import { TileData } from './gfx/TileData';
import { demoNesTile, tileCodecs, TileCodec } from './gfx/tileCodec';

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
export class TileView {
    element: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null = null;
    metrics: Readonly<TileViewMetrics> = defaultMetrics;
    owner: Site | null = null;
    pixels: TileData = defaultTileData;
    palette: Palette = defaultPalette;
    selectedColor = 2; // todo: default to 0

    constructor() {
        this.element = $.create('canvas') as HTMLCanvasElement;
    }

    /** Initializes this element for use. Can be called multiple times if the object is re-used. */
    initialize(width: number, height: number, metrics: TileViewMetrics) {
        // this.element.setAttribute('width', width.toString());
        // this.element.setAttribute('height', height.toString());
        this.element.width = width;
        this.element.height = height;
        this.element.style.background = 'white';
        this.context = this.element.getContext('2d')!;


        this.metrics = { ...metrics };
        this.pixels = new TileData(this.metrics.width, this.metrics.height);
    }

    site(owner: Site) {
        owner.site.appendChild(this.element);
        this.owner = owner;

        this.element.addEventListener('mousemove', e => this.onMouseMove(e));
        this.element.addEventListener('mousedown', e => this.onMouseDown(e));
        this.element.addEventListener('mouseup', e => this.onMouseUp(e));
        //this.element.addEventListener('oncontextmenu', e => (e.preventDefault(), console.log('ctx'), false));
        this.element.oncontextmenu = () => false;
    }

    unsite() {
        if (!this.owner) throw Error('Can not unsite an unsited component.');
        this.owner.site.removeChild(this.element);
        this.owner = null;
    }

    onMouseMove(e: MouseEvent) {
        var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);
    }
    onMouseDown(e: MouseEvent) {
        e.preventDefault();

        var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);

        if (e.button === 0) {
            var px = Math.floor(x / this.metrics.pixelWidth);
            var py = Math.floor(y / this.metrics.pixelHeight);
            var top = py * this.metrics.pixelWidth;
            var left = px * this.metrics.pixelHeight;
            var iColor = this.selectedColor;
            if (iColor >= this.palette.length) iColor = this.palette.length - 1;
            this.context!.fillStyle = 'red'; // RGBA.toStyle(this.palette[iColor]);
            this.context!.fillRect(left, top, this.metrics.pixelWidth, this.metrics.pixelHeight);
        
            this.pixels.setPixel(px, py, this.selectedColor);
        } else if (e.button === 2) {
            var nesTile = demoNesTile;
            var codec = tileCodecs.nesCodec;

            codec.decode(
                { data: nesTile, offset: 0 },
                { data: this.pixels, offset: 0 }
            );

            this.redraw();
        }    
    }
 
    onMouseUp(e: MouseEvent) {
        e.preventDefault();
        var { x, y } = coords.absToElement(Volatile.point(e.clientX, e.clientY), this.element);
    }

    /** Rerenders the tile image based on this object's pixel data. Call when pixel data or palette changes. */
    redraw() {
        var { width, height, pixelWidth: pw, pixelHeight: ph } = this.metrics;
        var iPxl = 0;
        var data = this.pixels.data;
        var pal = this.palette;

        for (var y = 0; y < height; y++){
            for (var x = 0; x < width; x++) {
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


export interface TileViewMetrics {
    width: number;
    height: number;
    pixelWidth: number;
    pixelHeight: number;
}


const defaultMetrics = {
    width: 16,
    height: 16,
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