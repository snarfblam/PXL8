import { TileCodec, BufferPointer, TilePointer, SwatchPaletteCue, PaletteCue } from './tileCodec';
import { Arrayish } from '../util';

var nesPalette: SwatchPaletteCue = {
    type: "swatches",
    gridWidth: 14,
    rrggbb: [
        "7C7C7C", "0000FC", "0000BC", "4428BC", "940084", "A80020", "A81000",
        "881400", "503000", "007800", "006800", "005800", "004058", "000000",

        "BCBCBC", "0078F8", "0058F8", "6844FC", "D800CC", "E40058", "F83800",
        "E45C10", "AC7C00", "00B800", "00A800", "00A844", "008888", "000000",

        "F8F8F8", "3CBCFC", "6888FC", "9878F8", "F878F8", "F85898", "F87858",
        "FCA044", "F8B800", "B8F818", "58D854", "58F898", "00E8D8", "787878",

        "FCFCFC", "A4E4FC", "B8B8F8", "D8B8F8", "F8B8F8", "F8A4C0", "F0D0B0",
        "FCE0A8", "F8D878", "D8F878", "B8F8B8", "B8F8D8", "00FCFC", "D8D8D8",
    ],
};

export var nesCodec = {
    bytesPerTile: 0x10,
    bitsPerPixel: 2,
    tileWidth: 8,
    tileHeight: 8,

    paletteCue: nesPalette,

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