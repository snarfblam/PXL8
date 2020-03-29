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
            r: (value & 0xFF0000) >>> 16,
            g: (value & 0xFF00) >>> 8,
            b: value & 0xFF,
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
        
        // return "#" +
        //     byteToHex(value.r) +
        //     byteToHex(value.g) +
        //     byteToHex(value.b) +
        //     byteToHex(value.a);
        if (value.a === 255) {
            return "rgb(" +
                (255 &value.r).toString() + ", " +
                (255 &value.g).toString() + ", " +
                (255 &value.b).toString() + ")";
        } else {
            return "rgba(" + 
                (255 &value.r).toString() + ", " + 
                (255 &value.g).toString() + ", " + 
                (255 &value.b).toString() + ", " + 
                (value.a / 255).toFixed(4) + ")";
        }
        
    },
};

function byteToHex(val: number) {
    var result = val.toString(16);
    if (result.length == 1) return '0' + result;
    return result;
}
export type Palette = RGBA[];
export type StylePalette = string[];

// export const debugPalette = [
//     { r: 0x00, g: 0x00, b: 0x00, a: 0xFF }, // black
//     { r: 0xFF, g: 0x00, b: 0x00, a: 0xFF }, // red
//     { r: 0x00, g: 0x00, b: 0xFF, a: 0xFF }, // blue
//     { r: 0x00, g: 0xFF, b: 0x00, a: 0xFF }, // green
// ];
export const debugPalette = [
    // { r: 0x00, g: 0xFF, b: 0xFF, a: 0xFF }, // sky
    // { r: 0xFF, g: 0x00, b: 0x00, a: 0xFF }, // red
    // { r: 0xFF, g: 0xDD, b: 0xBB, a: 0xFF }, // skin
    // { r: 0x00, g: 0x00, b: 0x00, a: 0xFF }, // black
    { r: 0x7C, g: 0x7C, b: 0x7C, a: 0xFF },
    { r: 0x00, g: 0x00, b: 0xFC, a: 0xFF },
    { r: 0x00, g: 0x00, b: 0xBC, a: 0xFF },
    { r: 0x44, g: 0x28, b: 0xBC, a: 0xFF },
    { r: 0x94, g: 0x00, b: 0x84, a: 0xFF },
    { r: 0xA8, g: 0x00, b: 0x20, a: 0xFF },
    { r: 0xA8, g: 0x10, b: 0x00, a: 0xFF },
    { r: 0x88, g: 0x14, b: 0x00, a: 0xFF },
    { r: 0x50, g: 0x30, b: 0x00, a: 0xFF },
    { r: 0x00, g: 0x78, b: 0x00, a: 0xFF },
    { r: 0x00, g: 0x68, b: 0x00, a: 0xFF },
    { r: 0x00, g: 0x58, b: 0x00, a: 0xFF },
    { r: 0x00, g: 0x40, b: 0x58, a: 0xFF },
    { r: 0x00, g: 0x00, b: 0x00, a: 0xFF },
];

function newRGBA() { return { r: 0, g: 0, b: 0, a: 255 } as RGBA };
const undefinedColor = { r: 0, g: 0, b: 0, a: 0 };
export class ManagedPalette {
    data = [] as RGBA[];
    styles = [] as (string | null)[];

    constructor(size?: number);
    constructor(data: RGBA[]);
    constructor(arg: number | RGBA[] | undefined) {
        var size = 0;
        if (typeof arg === 'number') {
            size = arg;
        } else if (arg) {
            size = arg.length;
        }

        for (var i = 0; i < size; i++) {
            this.data.push(newRGBA());
            this.styles.push(null);
        }
        if (arg instanceof Array) {
            for (var i = 0; i < size; i++) {
                this.setColor(i, arg[i]);
            }            
        }
    }

    resize(count: number) {
        while (this.data.length > count) {
            this.data.pop();
            this.styles.pop();
        }

        while (this.data.length < count) {
            this.data.push(newRGBA());
            this.styles.push(null);
        }
    }

    cloneColors() {
        var result = [] as RGBA[];
        for (var i = 0; i < this.data.length; i++){
            var { r, g, b, a } = this.data[i];
            result.push({ r, g, b, a });
        }

        return result;
    }

    getColor(index: number, output?: RGBA) {
        var result = (this.data[index] || undefinedColor) as Readonly<RGBA>;
        if (output) {
            output.r = result.r;
            output.g = result.g;
            output.b = result.b;
            output.a = result.a;
            result = output;
        }
        return result;
    }

    setColor(index: number, value: RGBA) {
        var color = (this.data[index] || undefinedColor);
        color.r = value.r & 255;
        color.g = value.g & 255;
        color.b = value.b & 255;
        color.a = value.a & 255;
        if (0 <= index && index < this.styles.length) {
            this.styles[index] = null;
        }
    }

    getStyle(index: number) {
        var style = this.styles[index];
        if (style) {
            return style;
        } else {
            var color = (this.data[index] || undefinedColor);
            if (color.a === 255) {
                style = "rgb(" +
                    color.r.toString() + ", " +
                    color.g.toString() + ", " +
                    color.b.toString() + ")";
            } else {
                style ="rgba(" + 
                    color.r.toString() + ", " + 
                    color.g.toString() + ", " + 
                    color.b.toString() + ", " + 
                    (color.a / 255).toFixed(4) + ")";
            }

            if (0 <= index && index < this.styles.length) {
                this.styles[index] = style;
            }
    
            return style; 
        }
    }

    getLength() { return this.data.length; }
}