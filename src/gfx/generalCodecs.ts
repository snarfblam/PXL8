import { TileCodec, BufferPointer, TilePointer, SwatchPaletteCue, PaletteCue } from './tileCodec';
import { Arrayish } from '../util';

export const Codec1Bpp: TileCodec = {
    bitsPerPixel: 1,
    bytesPerTile: 8,
    tileWidth: 8,
    tileHeight: 8,
    paletteCue: {
        rMax: 4,
        gMax: 4,
        bMax: 4,
        type: "rgb",
    },
    decode: (source, dest) => {
        var destTile = dest.data;
        if (destTile.width < 8) throw Error("codec requires 8-px-wide TileData");

        var src = source.data;
        var pSrc = source.offset;
        var dst: Arrayish<number> = destTile.data;
        var pDst = dest.offset;
        var stride = destTile.width;

        for (var y = 0; y < 8; y++) {
            var row = src[pSrc];
            for (var x = 0; x < 8; x++) {
                dst[pDst + 7 - x] = row & 1;
                row = row >> 1;
            }
            pDst += stride;
            pSrc += 1;
        }
    },
    encode: (source, dest) => {
        var srcData = source.data.data;
        var srcOffset = source.offset;
        var dstData = dest.data as Arrayish<number>;
        var dstOffset = dest.offset;

        for (var y = 0; y < 8; y++) {
            var byte1 = 0; // contains the low bit of each pixel in this row
            var flag = 0x80;
            for (var x = 0; x < 8; x++){
                var pixel = srcData[srcOffset];
                if (pixel & 1) byte1 = byte1 | flag;
                flag = flag >>> 1;
                srcOffset++;
            }

            dstData[dstOffset + y] = byte1;
        }
    }
};