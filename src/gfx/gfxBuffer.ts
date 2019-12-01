import { TileCodec, tileCodecs, TilePointer, BufferPointer } from './tileCodec';
import { $, $$ } from '../dollar';
import { StylePalette, Palette } from './palette';
import { TileData } from './TileData';

/** Blittable tile graphics storage */
export class GfxBuffer {
    readonly metrics: GfxBufferMetrics;
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    codec: TileCodec | null = null;
    palette: Palette | null = null;
    
    private pixelBuffer: TileData;

    constructor(metrics: GfxBufferMetrics) {
        this.canvas = $.create('canvas') as HTMLCanvasElement;
        this.canvas.width = metrics.gridWidth * metrics.tileWidth;
        this.canvas.height = metrics.gridHeight * metrics.tileHeight;
        this.context = this.canvas.getContext('2d')!;

        this.pixelBuffer = new TileData(metrics.tileWidth, metrics.tileHeight);
        this.metrics = { ...metrics };
    }

    loadTile(source: BufferPointer, destX: number, destY: number) {
        var codec = this.codec;
        var pal = this.palette;
        if (codec == null || pal == null) throw Error('Must specify palette and codec before calling loadTile');

        // extract pixels
        codec.decode(source, { data: this.pixelBuffer, offset: 0 });
        var tileData = this.pixelBuffer.data;

        // lock for blit
        var pxX = destX * this.metrics.tileWidth;
        var pxY = destY * this.metrics.tileHeight;
        var lock = this.context.getImageData(pxX, pxY, this.metrics.tileWidth, this.metrics.tileHeight);
        var lockData = lock.data; // rgba (#AABBGGRR)

        // convert indexed pixels to RGBA pixels
        var pLockData = 0;
        var pal0 = pal[0];
        for (var pTileData = 0; pTileData < tileData.length; pTileData++) {
            var iColor = tileData[pTileData];
            var color = pal[iColor] || pal0;
            lockData[pLockData] = color.r; pLockData++;
            lockData[pLockData] = color.g; pLockData++;
            lockData[pLockData] = color.b; pLockData++;
            lockData[pLockData] = color.a; pLockData++;
        }

        // unlock/blit
        this.context.putImageData(lock, pxX, pxY);
    }
}

export interface GfxBufferMetrics {
    gridWidth: number,
    gridHeight: number,
    tileWidth: number,
    tileHeight: number,
}