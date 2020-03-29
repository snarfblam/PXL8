import { TileCodec, BufferPointer, TilePointer, SwatchPaletteCue, PaletteCue } from './tileCodec';
import { Arrayish } from '../util';

const snesPaletteCue: PaletteCue = {
    type: "rgb",
    rMax: 31,
    gMax: 31,
    bMax: 31,
};

export var snesCodec4Bpp = {
    bytesPerTile: 0x20,
    bitsPerPixel: 4,
    tileWidth: 8,
    tileHeight: 8,

    paletteCue: snesPaletteCue,

    decode: function decode(source: BufferPointer, dest: TilePointer) {
        var destTile = dest.data;
        if (destTile.width < 8) throw Error("gbCodec requires 8-px-wide TileData");

        var src = source.data;
        var pSrc = source.offset;
        var dst: Arrayish<number> = destTile.data;
        var pDst = dest.offset;
        var stride = destTile.width;

        for (var y = 0; y < 8; y++) {
            var plane0 = src[pSrc];
            var plane1 = src[pSrc + 1] << 1;
            var plane2 = src[pSrc + 16] << 2;
            var plane3 = src[pSrc + 17] << 3;
            var shift = 0;
            for (var x = 0; x < 8; x++) {
                var color = 
                    (plane0 >> shift & 1) |
                    (plane1 >> shift & 2) |
                    (plane2 >> shift & 4) |
                    (plane3 >> shift & 8);
                dst[pDst + 7 - x] = color;
                shift++;
            }
            pDst += stride;
            pSrc += 2;
        }
    },
    encode: function encode(source: TilePointer, dest: BufferPointer) {
        var srcData = source.data.data;
        var srcOffset = source.offset;
        var dstData = dest.data as Arrayish<number>;
        var dstOffset = dest.offset;

        for (var y = 0; y < 8; y++) {
            var plane0 = 0;
            var plane1 = 0;
            var plane2 = 0;
            var plane3 = 0;
            var shift = 0;
            for (var x = 0; x < 8; x++){
                var pixel = srcData[srcOffset];
                plane0 |= (pixel & 1) << shift;
                plane1 |= (pixel & 2) << (shift - 1);
                plane2 |= (pixel & 1) << (shift - 2);
                plane3 |= (pixel & 2) << (shift - 3);
                srcOffset++;
            }

            const destPlane0 = dstOffset + y * 2;
            const destPlane2 = destPlane0 + 16;
            dstData[destPlane0] = plane0;
            dstData[destPlane0 + 1] = plane1;
            dstData[destPlane2] = plane2;
            dstData[destPlane2 + 1] = plane3;
        }
    },
} as TileCodec;