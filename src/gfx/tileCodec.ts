import { StylePalette, RGBA } from "./palette";
import { TileData } from "./TileData";
import { Arrayish } from '../util';

import { nesCodec } from './nesCodec';
import { gbCodec } from './gbCodec';

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

    paletteCue?: PaletteCue,
}

export const nullCodec = {
    bytesPerTile: 1,
    bitsPerPixel: 1,
    tileWidth: 1,
    tileHeight: 1,
    decode: (source: BufferPointer, dest: TilePointer) => {},
    encode: (source: TilePointer, dest: BufferPointer) => {},
}

export type PaletteCue = RgbPaletteCue | SwatchPaletteCue;
export const PaletteCue = {
    default: {
        type: 'rgb',
        rMax: 255,
        gMax: 255,
        bMax: 255,
    } as PaletteCue,
};

/** Serves as a cue that the specified format uses colors specified as RGB values. */
export interface RgbPaletteCue {
    /** Fixed color selection */
    type: 'rgb',
    /** The highest value that can be specified for a component. E.g. for 
     * 24-bit color the max for each component would be 255. */
    rMax: number,
    /** The highest value that can be specified for a component. E.g. for 
     * 24-bit color the max for each component would be 255. */
    gMax: number,
    /** The highest value that can be specified for a component. E.g. for 
     * 24-bit color the max for each component would be 255. */
    bMax: number,
}

/** Serves as a cue that the specified format uses a predefined color palette. */
export interface SwatchPaletteCue {
    /** Fixed color selection */
    type: 'swatches',
    /** The number of swatches to present to the user in UI. Optional. */
    gridWidth?: number,
    /** An array of strings in the format of RRGGBB */
    rrggbb: string[],
};

export const SwatchPaletteCue = {
    rrggbbToRGBA: function rrggbbToRGBA(rrggbb: string[]) {
        var result: RGBA[] = [];
        rrggbb.forEach(value => {
            if (value.length != 6) result.push({ r: 0, g: 0, b: 0, a: 255 });
            var r = parseInt(value.substring(0, 2), 16);
            var g = parseInt(value.substring(2, 4), 16);
            var b = parseInt(value.substring(4, 6), 16);
            result.push({ r, g, b, a: 255 });
        });

        return result;
    },

};

export const tileCodecs = {
    nesCodec,
    gbCodec,
};

export const demoNesTile = [
    0x41, 0xC2, 0x44, 0x48, 0x10, 0x20, 0x40, 0x80, 0x01, 0x02, 0x04, 0x08, 0x16, 0x21, 0x42, 0x87,
];