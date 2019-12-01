
/** Represents indexed image data as an array of pixel values. */
export class TileData {
    data: Uint8Array;
    constructor(public readonly width: number, public readonly height: number) {
        this.data = new Uint8Array(width * height);
    }

    getPixel(x: number, y: number) {
        return this.data[x + y * this.width];
    }

    setPixel(x: number, y: number, value: number) {
        this.data[x + y * this.width] = value;
    }

    
}