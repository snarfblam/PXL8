export interface $like<T>  {
    (selector: string): T;
    create: (tag: string) => HTMLElement;
}

var $ = function $(selector: string) {
    return document.querySelector(selector);
} as $like<Element>;

$.create = function create(tag: string) {
    return document.createElement(tag);
}

var $$ = function $$(selector: string) {
    var result = document.querySelectorAll(selector);
    return Array.prototype.slice.call(result) as Element[];
} 




export { $, $$ };