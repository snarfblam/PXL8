import { Point } from './math';
/** Represents a volatile function argument or return value. See remarks.
 * 
 * @remarks
 * A volatile value is an object or array whose contents may potentially be
 * changed by any function. Therefore its state is only valid between the 
 * time the value is received (i.e. returned from a function, or passed in
 * as an argument) and the first time program control leaves the recipient
 * function (explicitly or implicitly invoking any other function).
 * 
 * The purpose is to allow passing and returning of complex values without
 * generating garbage, and typical usage should involve immediate destructuring.
 * Any recycled object can be used as a Volatile, however the Volatile object
 * provides convenience methods for some common types.
 * 
 * Typical usage to receive return value: var {x, y} = getLocation();
 * 
 * Typical usage to pass arguments: setLocation(Volatile.point(15, 30));
 */
export type Volatile<T> = {
    readonly [P in keyof T]: T[P];
};
export function AsVolatile<T>(value: T) { return value as Volatile<T>; }


var volatilePoint: Point = { x: 0, y: 0 };
export const Volatile = {
    point: function (x: number, y: number) { 
        volatilePoint.x = x;
        volatilePoint.y = y;
        return volatilePoint as Volatile<Point>;
    },
}

export function saveBlob(blob: Blob, filename: string) {
    if (window.navigator.msSaveOrOpenBlob as any) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}

export function prependChildElement(target: HTMLElement, element: HTMLElement) {
    var firstChild = target.firstChild;
    if (firstChild) {
        target.insertBefore(element, firstChild);
    } else {
        target.appendChild(element);
    }
}

export const coords = {
    absToElement: function absToElement(coord: Point, elem: HTMLElement) {
        var rect = elem.getBoundingClientRect();
        return Volatile.point(coord.x - rect.left, coord.y - rect.top);
    },
}

export function eventToClientCoords(elem: HTMLElement, e: MouseEvent) {
    var box = elem.getBoundingClientRect();
    var x = e.clientX - box.left;
    var y = e.clientY - box.top;
    return Volatile.point(x, y);
}

export function removeFrom<T>(array: T[], item: T) {
    var index = array.indexOf(item);
    if (index < 0) return false;
    array.splice(index, 1);
    return true;
}

/** A mutable counterpart to ArrayLike. */
export interface Arrayish<T> {
    readonly length: number;
    [n: number]: T;
}

export enum Direction {
    "up" = "up",
    "down" = "down",
    "left" = "left",
    "right" = "right",
}

export enum Orientation {
    "horizontal" = "horizontal",
    "vertical" = "vertical",
}