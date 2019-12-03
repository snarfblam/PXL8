
import { $, $$ } from './dollar';
import { Site, SiteChild } from './site';
import { coords, Volatile, Arrayish, eventToClientCoords } from './util';
import { GfxBuffer, GfxBufferMetrics } from './gfx/gfxBuffer';
import { TileCodec } from './gfx/tileCodec';
import { Palette } from './gfx/palette';
import { TileData } from './gfx/TileData';

export class GfxView {
    element: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null = null;
    owner: Site | null = null;
    metrics: GfxViewMetrics = defaultMetrics;
    gfxData: Arrayish<number> | null = null;
    codec: TileCodec | null = null;
    buffer: GfxBuffer | null = null;
    palette: Palette | null = null;

    constructor() {
        this.element = $.create('canvas') as HTMLCanvasElement;
    }

    /** Initializes this element for use. Can be called multiple times if the object is re-used. */
    initialize(metrics?: GfxViewMetrics) {
        var newMetrics = metrics || defaultMetrics;
        // this.element.setAttribute('width', width.toString());
        // this.element.setAttribute('height', height.toString());
        this.element.width = newMetrics.pixelWidth * newMetrics.tileWidth * newMetrics.gridWidth;
        this.element.height = newMetrics.pixelHeight * newMetrics.tileHeight * newMetrics.gridHeight;
        this.element.style.background = 'white';
        this.context = this.element.getContext('2d')!;
        this.context.imageSmoothingEnabled = false;

        this.metrics = { ...newMetrics };

        var bufferMetrics = {
            gridWidth: newMetrics.gridWidth,
            gridHeight: 1,
            tileWidth: newMetrics.tileHeight,
            tileHeight: newMetrics.tileHeight
        };
        this.buffer = new GfxBuffer(bufferMetrics);
    }

    displayOffset(offset: number) {
        var { codec, gfxData, buffer, context, palette, metrics } = this;

        if (codec == null || gfxData == null || buffer == null || context == null || palette == null) {
            throw Error("GfxView object not initialized or required property not set (codec, gfxData, palette).");
        }
        
        buffer.palette = palette; 
        buffer.codec = codec;

        var availLen = gfxData.length - offset;
        var availTiles = Math.floor(availLen / codec.bytesPerTile);
        availTiles = Math.min(availTiles, this.metrics.gridWidth * this.metrics.gridHeight);
        var tileY = 0;
        var src = { data: gfxData, offset };

        while (availTiles > 0) {
            var tilesToRender = Math.min(this.metrics.gridWidth, availTiles);
            for (var iTile = 0; iTile < tilesToRender; iTile++) {
                buffer.loadTile(src, iTile, 0);
                src.offset += 0x10;
            }

            var outY = tileY * metrics.tileHeight * metrics.pixelHeight;
            var outWidth = tilesToRender * metrics.tileWidth * metrics.pixelWidth;
            var outHeight = metrics.tileHeight * metrics.pixelHeight;
            context.drawImage(buffer.canvas,
                // src
                0, 0, this.metrics.tileWidth * tilesToRender, this.metrics.tileHeight,
                // dest
                0, outY, outWidth, outHeight    
            );

            tileY++;
            availTiles -= tilesToRender;
        }
    }


    site(owner: Site) {
        SiteChild(this.element, owner);
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
        var { x, y } = eventToClientCoords(this.element, e);
        //     // view.element.onmousedown = function (e) {
//     //     var b = view.element.getBoundingClientRect();
//     //     var x = (e.clientX - b.left) / view.metrics.pixelWidth;
//     //     var y = (e.clientY - b.top) / view.metrics.pixelHeight;
        var tileX = Math.floor(x / this.metrics.tileWidth);
        var tileY = Math.floor(y / this.metrics.tileHeight);
        var tileIndex = tileY * this.metrics.gridWidth + tileX;
//     //     var offset = tileIndex * view.codec!.bytesPerTile + 0x40010;

//     //     var pixelData = editor.pixels;
//     //     view.codec!.decode({ data: buffy, offset }, { data: pixelData, offset: 0 });
//     //     editor.redraw();
//     // };
    }
    onMouseDown(e: MouseEvent) {
        e.preventDefault();

        var { x, y } = eventToClientCoords(this.element, e);

    }
 
    onMouseUp(e: MouseEvent) {
        e.preventDefault();
        var { x, y } = eventToClientCoords(this.element, e);
    }

   

    dispose() {
    }
}

export interface GfxViewMetrics {
    tileWidth: number,
    tileHeight: number,
    gridWidth: number,
    gridHeight: number,
    pixelWidth: number,
    pixelHeight: number,
}

var defaultMetrics = {
    tileWidth: 8,
    tileHeight: 8,
    gridWidth: 16,
    gridHeight: 16,
    pixelWidth: 2,
    pixelHeight: 2,
};