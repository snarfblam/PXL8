
import { $, $$ } from '../dollar';
import { Site, siteChild } from '../site';
import { coords, Volatile, Arrayish, eventToClientCoords } from '../util';
import { GfxBuffer, GfxBufferMetrics } from '../gfx/gfxBuffer';
import { TileCodec } from '../gfx/tileCodec';
import { Palette, RGBA } from '../gfx/palette';
import { TileData } from '../gfx/TileData';
import { EventManager } from '../eventManager';
import { GfxSelection } from './gfxSelection';
import { Widget, WidgetLike } from '../widgets/widget';
import { WidgetMouseEvent, MouseButton } from '../widgets/input';

export interface GfxViewEvents {
    /** Raised when the user selects a tile to edit. */
    tilePicked?: (index: number) => void;
    /** Raised when the user selects a tile to add to the arranger. */
    tilePopped?: (index: number) => void;
}
export class GfxView extends Widget<GfxViewEvents> {
    // element: HTMLElement;
    context: CanvasRenderingContext2D | null = null;
    // owner: Site | null = null;
    metrics: GfxViewMetrics = defaultMetrics;
    gfxData: Arrayish<number> | null = null;
    codec: TileCodec | null = null;
    buffer: GfxBuffer | null = null;
    palette: Palette | null = null;
    // private eventManager = new EventManager<GfxViewEvents>();
    // public events = this.eventManager.subscriber;
    public readonly selection: GfxSelection;

    constructor() {
        super(true);
        // this.element = $.create('canvas') as HTMLCanvasElement;
        this.selection = new GfxSelection(this);
    }

    createElement() {
        return $.create('canvas');
    }

    /** Initializes this element for use. Can be called multiple times if the object is re-used. */
    initialize(metrics?: GfxViewMetrics) {
        var newMetrics = metrics || defaultMetrics;
        // this.element.setAttribute('width', width.toString());
        // this.element.setAttribute('height', height.toString());
        (this.element as HTMLCanvasElement).width = newMetrics.pixelWidth * newMetrics.tileWidth * newMetrics.gridWidth;
        (this.element as HTMLCanvasElement).height = newMetrics.pixelHeight * newMetrics.tileHeight * newMetrics.gridHeight;
        this.setStyle('background', 'white');
        this.setStyle('position', 'relative');

        this.createContext();

        this.metrics = { ...newMetrics };

        var bufferMetrics = {
            gridWidth: newMetrics.gridWidth,
            gridHeight: 1,
            tileWidth: newMetrics.tileHeight,
            tileHeight: newMetrics.tileHeight
        };
        this.buffer = new GfxBuffer(bufferMetrics);

        this.subscribeToEvent('mousemove');
        this.subscribeToEvent('mousedown');
        this.subscribeToEvent('mouseup');
        
    }

    private createContext() {
        this.context = (this.element as HTMLCanvasElement).getContext('2d')!;
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

    /**
     * Refreshes the specified tile. It will be assumed 
     * that an entire tile's worth of bytes have been changed, which means two
     * tiles will be updated if specified tile data crosses a tile boundary
     * within the view.
     * @param viewOffset The base offset of the view
     * @param relativeOffset The offset of the changed data. 
     */
    refreshTile(viewOffset: number, relativeOffset: number) {
        var { codec } = this;

        if (codec == null) {
            throw Error("GfxView object not initialized or required property not set (codec, gfxData, palette).");
        }
        
        var byteSize = codec.bytesPerTile;
        var index = Math.floor(relativeOffset / byteSize);
        var index2 = Math.floor((relativeOffset + byteSize - 1) / byteSize);

        this._refreshTile(viewOffset, index);
        if (index !== index2)
            this._refreshTile(viewOffset, index2);
    }

    private _refreshTile(viewOffset: number, index: number) {
        var { codec, gfxData, buffer, context, palette, metrics } = this;
        console.log(index);
        if (codec == null || gfxData == null || buffer == null || context == null || palette == null) {
            throw Error("GfxView object not initialized or required property not set (codec, gfxData, palette).");
        }
        
        buffer.palette = palette;
        buffer.codec = codec;

        var tileOffset = viewOffset + index * codec.bytesPerTile;
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
        (this.element as HTMLCanvasElement).height = height;
        this.createContext();
    }

    onSited() {
        super.onSited();
        this.element.oncontextmenu = () => false;
    }

    onMouseMove(e: WidgetMouseEvent) {
        // var { x, y } = eventToClientCoords(this.element, e);
        // var tileX = Math.floor(x / this.metrics.tileWidth);
        // var tileY = Math.floor(y / this.metrics.tileHeight);
        // var tileIndex = tileY * this.metrics.gridWidth + tileX;
    }
    onMouseDown(e: WidgetMouseEvent) {
        e.preventDefault();

        var { x, y } = eventToClientCoords(this.element, e);
        var tileX = Math.floor(x / (this.metrics.tileWidth * this.metrics.pixelWidth));
        var tileY = Math.floor(y / (this.metrics.tileHeight * this.metrics.pixelHeight));
        var tileIndex = tileX + tileY * this.metrics.gridWidth;

        if (e.button === MouseButton.left) {
            this.raise("tilePicked", tileIndex);
        } else if (e.button === MouseButton.right) {
            this.raise("tilePopped", tileIndex);
        }
    }
 
    onMouseUp(e: WidgetMouseEvent) {
        e.preventDefault();
        // var { x, y } = eventToClientCoords(this.element, e);
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