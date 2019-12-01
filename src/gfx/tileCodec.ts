import { StylePalette } from "./palette";
import { TileData } from "./TileData";

interface Arrayish<T> {
    readonly length: number;
    [n: number]: T;
}

export interface BufferPointer {
    data: ArrayLike<number>;
    offset: number;
}

export interface TilePointer{
    data: TileData,
    offset: number,
}

/** Converts raw binary data to and from TileData */
export interface TileCodec {
    bytesPerTile: number;
    bitsPerPixel: number;
    tileWidth: number;
    tileHeight: number;

    decode: (source: BufferPointer, dest: TilePointer) => void;
    encode: (source: TilePointer, dest: BufferPointer) => void;
}

const nesCodec = {
    bytesPerTile: 0x10,
    bitsPerPixel: 2,
    tileWidth: 8,
    tileHeight: 8,
    decode: function decode(source: BufferPointer, dest: TilePointer) {
        var destTile = dest.data;
        if (destTile.width < 8) throw Error("nesCodec requires 8-px-wide TileData");

        var src = source.data;
        var pSrc = source.offset;
        var dst: Arrayish<number> = destTile.data;
        var pDst = dest.offset;
        var stride = destTile.width;

        for (var y = 0; y < 8; y++) {
            var rowLo = src[pSrc];
            var rowHi = src[pSrc + 8];
            for (var x = 0; x < 8; x++) {
                var color = (rowLo & 1) | ((rowHi & 1) << 1);
                rowLo = rowLo >> 1;
                rowHi = rowHi >> 1;
                dst[pDst + 7 - x] = color;
            }
            pDst += stride;
            pSrc++;
        }
    },
    encode: function encode(source: TilePointer, dest: BufferPointer) {

    },
} as TileCodec;

export const tileCodecs = {
    nesCodec,
};

export const demoNesTile = [
    0x41, 0xC2, 0x44, 0x48, 0x10, 0x20, 0x40, 0x80, 0x01, 0x02, 0x04, 0x08, 0x16, 0x21, 0x42, 0x87,
];