export interface Point{
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function clamp(value: number, min: number, max: number) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/** Formats a 32-bit integer as an 8-digit hexadecimal value. */
export function intToHex(value: number) {
    (((value | 0) + 4294967296).toString(16)).substr(-8); /*
      ( 32-bits )
     (            > 0         )
    (                           as hex     )
                                             truncate
    */
    
}
/** A value an 8-bit value can be multiplied by to move it into the upper 32 bits of an integer. */
export const bitMult24 = 2 ** 24;