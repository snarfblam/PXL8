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
import { GfxView } from './gfxView';
import { $, $$ } from './dollar';
import { tileCodecs } from './gfx/tileCodec';
import { debugPalette } from './gfx/palette';
import { RomView, ViewUnit } from './romView';
import { ROM } from './rom';
import { PaletteView } from './paletteView';
import { Direction, Orientation } from './util';
import { Scrollbar } from './scrollbar';

class Pxl8 {
    constructor() {
        var romView = new RomView();
        var appcontainer = document.querySelector('.app-container')as HTMLElement;
        romView.site({ site: appcontainer });
        romView.element.style.display = 'inline-block';
        console.log(appcontainer);
        (window as any).romView = romView;

        // var pal = new PaletteView();
        // pal.site({ site: document.body });
        // pal.events.subscribe({ paletteModified: () => console.log('event!') });
        // var editor = new TileView();
        // editor.initialize({ tileWidth: 8, tileHeight: 8, pixelWidth: 16, pixelHeight: 16 });
        // editor.site({ site: document.body });
        // console.log('sited');
        // editor.palette = debugPalette;
        // editor.element.style.margin = '2px';
        // var pixels = editor.pixels.data;
        // for (var i = 0; i < pixels.length; i++){
        //     var val = Math.floor(Math.random() * 2);
        //     pixels[i] = val;
        // }

        // editor.redraw();
        // (window as any).tileEditor = editor;

        var fileInput = $.create('input') as HTMLInputElement;
        fileInput.type = 'file';
        document.body.appendChild(fileInput);

        fileInput.onchange = e => {
            var file = fileInput.files![0];  
            onRomLoaded(file);
            
            // var reader = new FileReader();
            // reader.onload = e => {
            //     onFileLoaded(reader.result as ArrayBuffer);
            // }
            // reader.readAsArrayBuffer(file);
        };
    }
}

function $_(selector: string) { return $(selector) as HTMLElement };

function onRomLoaded(file: File) {
    var romView = ((window as any).romView as RomView);
    romView.loadRom(new ROM(file), tileCodecs.nesCodec);
    romView.setViewOffset(0);

    $_('.offset-page-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.page);
    $_('.offset-row-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.row);
    $_('.offset-tile-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.tile);
    $_('.offset-byte-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.byte);
    $_('.offset-byte-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.byte);
    $_('.offset-tile-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.tile);
    $_('.offset-row-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.row);
    $_('.offset-page-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.page);
}

// function onFileLoaded(contents: ArrayBuffer) {

//     // var editor = ((window as any).tileEditor as TileView);
    
//     // var buffy = new Uint8Array(contents);
//     // var view = new GfxView();
//     // view.initialize();
//     // view.codec = tileCodecs.nesCodec;
//     // view.palette = debugPalette;
//     // view.gfxData = buffy;
//     // view.site({
//     //     site: document.body,
//     //     placeElement: e => {
//     //         document.body.insertBefore(e, editor.element);
//     //     }   
//     // });
//     // view.displayOffset(0x40010);

//     // view.element.onmousedown = function (e) {
//     //     var b = view.element.getBoundingClientRect();
//     //     var x = (e.clientX - b.left) / view.metrics.pixelWidth;
//     //     var y = (e.clientY - b.top) / view.metrics.pixelHeight;
//     //     var tileX = Math.floor(x / view.metrics.tileWidth);
//     //     var tileY = Math.floor(y / view.metrics.tileHeight);
//     //     var tileIndex = tileY * view.metrics.gridWidth + tileX;
//     //     var offset = tileIndex * view.codec!.bytesPerTile + 0x40010;

//     //     var pixelData = editor.pixels;
//     //     view.codec!.decode({ data: buffy, offset }, { data: pixelData, offset: 0 });
//     //     editor.redraw();
//     // };
// }





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