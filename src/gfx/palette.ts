import * as pxlMath from '../math';

const FF000000 = 0xFF << 24;

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export type PackedRGBA = number;

export const RGBA = {
    /** Converts a 32-bit integer with ABGR ordering (#AABBGGRR) to an RGBA object. Canvas pixel data uses ABGR-ordered values. */
    fromNumABGR(value: number) {
        return {
            r: value & 0xFF,
            g: (value & 0xFF00) >>> 8,
            b: (value & 0xFF0000) >>> 16,
            a: (value & FF000000) >>> 24, 
        };
    },
    /** Converts an RGBA object to a 32-bit integer with ABGR ordering (#AABBGGRR). Canvas pixel data uses ABGR-ordered values. Component values should be in the range 0...255. Validation is not performed. */
    toNumABGR(value: RGBA) {
        return (value.a << 24) | (value.b << 16) | (value.g << 8) | value.r;
    },
    /** Converts a 32-bit integer with ARGB ordering (#AARRGGBB) to an RGBA object. */
    fromNumARGB(value: number) {
        return {
            b: value & 0xFF,
            g: (value & 0xFF00) >>> 8,
            r: (value & 0xFF0000) >>> 16,
            a: (value & FF000000) >>> 24, 
        };
    },
    /** Converts an RGBA value to a 32-bit integer with ARGB ordering (#AARRGGBB). Component values should be in the range 0...255. Validation is not performed. */
    toNumARGB(value: RGBA) {
        return (value.a << 24) | (value.r << 16) | (value.g << 8) | value.b;
    },
    /** Converts an RGBA object or ARGB-ordered number (#AARRGGBB) to a color style value such as '#FF0000FF1'. */
    toStyle(value: number | RGBA) {
        if (typeof value === 'number') {
            value = RGBA.fromNumARGB(value);
        }
        
        return "#" +
            byteToHex(value.r) +
            byteToHex(value.g) +
            byteToHex(value.b) +
            byteToHex(value.a);
        
    },
};

function byteToHex(val: number) {
    var result = val.toString(16);
    if (result.length == 1) return '0' + result;
    return result;
}
export type Palette = RGBA[];