
import { $, $$ } from './dollar';
import { Site, siteChild } from './site';
import { coords, Volatile, Arrayish, eventToClientCoords } from './util';
import { GfxBuffer, GfxBufferMetrics } from './gfx/gfxBuffer';
import { TileCodec } from './gfx/tileCodec';
import { Palette, RGBA } from './gfx/palette';
import { TileData } from './gfx/TileData';
import { EventManager } from './eventManager';
import { GfxSelection } from './gfxSelection';

export interface GfxViewEvents {
    tilePicked?: (index: number) => void;
}
export class GfxView {
    element: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null = null;
    owner: Site | null = null;
    metrics: GfxViewMetrics = defaultMetrics;
    gfxData: Arrayish<number> | null = null;
    codec: TileCodec | null = null;
    buffer: GfxBuffer | null = null;
    palette: Palette | null = null;
    private eventManager = new EventManager<GfxViewEvents>();
    public events = this.eventManager.subscriber;
    public readonly selection: GfxSelection;

    constructor() {
        this.element = $.create('canvas') as HTMLCanvasElement;
        this.selection = new GfxSelection(this);
    }

    /** Initializes this element for use. Can be called multiple times if the object is re-used. */
    initialize(metrics?: GfxViewMetrics) {
        var newMetrics = metrics || defaultMetrics;
        // this.element.setAttribute('width', width.toString());
        // this.element.setAttribute('height', height.toString());
        this.element.width = newMetrics.pixelWidth * newMetrics.tileWidth * newMetrics.gridWidth;
        this.element.height = newMetrics.pixelHeight * newMetrics.tileHeight * newMetrics.gridHeight;
        this.element.style.background = 'white';
        this.element.style.position = 'relative';

        this.createContext();

        this.metrics = { ...newMetrics };

        var bufferMetrics = {
            gridWidth: newMetrics.gridWidth,
            gridHeight: 1,
            tileWidth: newMetrics.tileHeight,
            tileHeight: newMetrics.tileHeight
        };
        this.buffer = new GfxBuffer(bufferMetrics);
    }

    private createContext() {
        this.context = this.element.getContext('2d')!;
        this.context.imageSmoothingEnabled = false;
    }

    displayOffset(offset: number) {
        var { codec, gfxData, buffer, context, palette, metrics } = this;

        if (codec == null || gfxData == null || buffer == null || context == null || palette == null) {
            throw Error("GfxView object not initialized or required property not set (codec, gfxData, palette).");
        }
        
        buffer.palette = palette; 
        buffer.codec = codec;
        var blankStyle = RGBA.toStyle(palette[0]);

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

            // Need to render any areas that we don't have data for as blank
            if (availTiles < this.metrics.gridWidth) {
                context.fillStyle = blankStyle;
                var rowWidth = metrics.tileHeight * metrics.pixelHeight * metrics.gridHeight;
                context.fillRect(0, outY, rowWidth, outHeight);
            }
            context.drawImage(buffer.canvas,
                // src
                0, 0, this.metrics.tileWidth * tilesToRender, this.metrics.tileHeight,
                // dest
                0, outY, outWidth, outHeight    
            );

            tileY++;
            availTiles -= tilesToRender;
        }

        // Need to render any areas that we don't have data for as blank
        if (tileY < this.metrics.gridHeight) {
            context.fillStyle = blankStyle;
            
            var outY = tileY * metrics.tileHeight * metrics.pixelHeight;
            var outWidth = metrics.gridWidth * metrics.tileWidth * metrics.pixelWidth;
            var outHeight = metrics.tileHeight * metrics.pixelHeight * (metrics.gridHeight - tileY);
            context.fillRect(0, tileY * metrics.tileHeight * metrics.pixelHeight, outWidth, outHeight);
        }
    }

    refreshTile(offset: number, index: number) {
        var { codec, gfxData, buffer, context, palette, metrics } = this;

        if (codec == null || gfxData == null || buffer == null || context == null || palette == null) {
            throw Error("GfxView object not initialized or required property not set (codec, gfxData, palette).");
        }
        
        buffer.palette = palette;
        buffer.codec = codec;

        var tileOffset = offset + index * codec.bytesPerTile;
        var offsetAfter = tileOffset + codec.bytesPerTile;
        var enoughData = index >= 0 && offsetAfter <= gfxData.length;

        if (enoughData) {
            var src = { data: gfxData, offset: tileOffset };
            buffer.loadTile(src, 0, 0);

            // Tile index
            var tileX = index % this.metrics.gridWidth;
            var tileY = Math.floor(index / this.metrics.gridWidth);
            // View coords
            var outX = tileX * metrics.tileWidth * metrics.pixelWidth;
            var outY = tileY * metrics.tileHeight * metrics.pixelHeight;
            var outWidth = metrics.tileWidth * metrics.pixelWidth;
            var outHeight = metrics.tileHeight * metrics.pixelHeight;
            context.drawImage(buffer.canvas,
                // src
                0, 0, this.metrics.tileWidth, this.metrics.tileHeight,
                // dest
                outX, outY, outWidth, outHeight
            );
        }
    }

    /** 
     * Configures the element to display the specified amount of content, but
     * does not actually update the display (displayOffset should be called
     * after resizing.)
     */
    resize(height: number) {
        console.log(height);

        const tileHeightPx = this.metrics.pixelHeight * this.metrics.tileHeight;
        var visibleRows = Math.floor((height + tileHeightPx - 1) / tileHeightPx);
        this.metrics.gridHeight = visibleRows;
        this.element.height = height;
        this.createContext();
    }

    site(owner: Site) {
        siteChild(this.element, owner);
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
        var tileX = Math.floor(x / this.metrics.tileWidth);
        var tileY = Math.floor(y / this.metrics.tileHeight);
        var tileIndex = tileY * this.metrics.gridWidth + tileX;
    }
    onMouseDown(e: MouseEvent) {
        e.preventDefault();

        var { x, y } = eventToClientCoords(this.element, e);
        var tileX = Math.floor(x / (this.metrics.tileWidth * this.metrics.pixelWidth));
        var tileY = Math.floor(y / (this.metrics.tileHeight * this.metrics.pixelHeight));
        var tileIndex = tileX + tileY * this.metrics.gridWidth;
        this.eventManager.raise("tilePicked", tileIndex);
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