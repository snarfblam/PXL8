import { StylePalette } from "./palette";
import { TileData } from "./TileData";
import { Arrayish } from '../util';


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
        var srcData = source.data.data;
        var srcOffset = source.offset;
        var dstData = dest.data as Arrayish<number>;
        var dstOffset = dest.offset;

        for (var y = 0; y < 8; y++) {
            var byte1 = 0; // contains the low bit of each pixel in this row
            var byte2 = 0; // contains the high bit of each pixel in this row
            var flag = 0x80;
            for (var x = 0; x < 8; x++){
                var pixel = srcData[srcOffset];
                if (pixel & 1) byte1 = byte1 | flag;
                if (pixel & 2) byte2 = byte2 | flag;
                flag = flag >>> 1;
                srcOffset++;
            }

            dstData[dstOffset + y] = byte1;
            dstData[dstOffset + y + 8] = byte2;
        }
        // throw Error('not implementing this until I can test it');
        // cause I know that I'll write a broken implementation, and when it 
        // doesn't work down the road I'll spend hours trying to debug it
    },
} as TileCodec;

export const tileCodecs = {
    nesCodec,
};

export const demoNesTile = [
    0x41, 0xC2, 0x44, 0x48, 0x10, 0x20, 0x40, 0x80, 0x01, 0x02, 0x04, 0x08, 0x16, 0x21, 0x42, 0x87,
];