/*
 *  hasher public interface
 *  
 *  Usage:

 * 
 *  Webpack:
 *      In the root directory, run the command `npm run build`.
 *      This runs webpack, and copies the bundle and the ROM
 *      database to the server folder.
 * 
 *  Test Server:
 *      Build the project as described above first. From the
 *      "server" directory, run the command `node index.js`.
 *      You can the access the test page at 
 *      http://localhost:8000/
 */

"use strict";

import { TileView } from './TileView';

class Pxl8 {
    constructor() {
        var editor = new TileView();
        editor.initialize(320, 240, { width: 20, height: 15, pixelWidth: 16, pixelHeight: 16 });
        editor.site({ site: document.body });
        var pixels = editor.pixels.data;
        for (var i = 0; i < pixels.length; i++){
            var val = Math.floor(Math.random() * 2);
            pixels[i] = val;
        }

        editor.redraw();
    }
}





/**
 * detect IE
 * returns version of IE or false, if browser is not Internet Explorer
 */
function detectIE() {
    var ua = window.navigator.userAgent;

    // Test values; Uncomment to check result …

    // IE 10
    // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

    // IE 11
    // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

    // Edge 12 (Spartan)
    // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

    // Edge 13
    // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
        // Edge (IE 12+) => return version number
        return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    // other browser
    return null;
}

var isIE = !!detectIE(); // true if it's IE
// @ts-ignore
window.poopMode = isIE;

// 'export default Hasher' produces an object {_deafult: Hasher}... not what we want
export default Pxl8;