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
import { tileCodecs, SwatchPaletteCue } from './gfx/tileCodec';
import { debugPalette } from './gfx/palette';
import { RomView, ViewUnit } from './romView';
import { ROM } from './rom';
import { PaletteView } from './paletteView';
import { Direction, Orientation } from './util';
import { Toolbar, ToolbarButton, ToolbarSize } from './toolbar';
import { Pxl8Toolbar, Pxl8StatusBar } from './pxl8Toolbars';
import { Site } from './site';
import { showFileDialog } from './fileDialog';
import { DocumentEvents, DocumentEditor } from './document';
import { EventManager } from './eventManager';
import { Modal, DemoModal } from './modal';
import { SwatchGrid } from './swatchGrid';
import { nesCodec } from './gfx/nesCodec';

class Pxl8 {
    private readonly appContainer = $('.app-container') as HTMLElement;
    private readonly eventManager = new EventManager<DocumentEvents>();
    private readonly toolbar = new Pxl8Toolbar();
    private readonly statusBar = new Pxl8StatusBar();
    private readonly romView = new RomView();
    private readonly docEditor: DocumentEditor;

    public readonly events = this.eventManager.subscriber;

    constructor() {
        var palView = this.statusBar.getPaletteView();

        this.docEditor = {
            events: this.events,
            getPrimaryColor: () => palView.getPrimarySelection(),
            getSecondaryColor: () => palView.getSecondarySlection(),
            getPalette: () => palView.getPalette(),
        };

        // Init components
        this.statusBar.setIconPath('res/icons');
        this.toolbar.setIconPath('res/icons');
        this.romView.element.style.display = 'inline-block';
        palView.setPalette(debugPalette);

        // Site components
        var appSite = { site: this.appContainer };
        var appSitePrepend: Site = { site: appSite.site, prepend: true };
        this.statusBar.site(appSitePrepend);
        this.toolbar.site(appSitePrepend);
        this.romView.site(appSite);
        console.log(appSite);
        (window as any).romView = this.romView;

        // Event handlers
        this.toolbar.events.subscribe({
            buttonClick: buttonName => {
                if (buttonName === 'import') {
                    showFileDialog()
                        .then(file => {
                            if (file) {
                                this.loadRom(file);
                            }
                        })
                        .catch(console.error);
                }
                if (buttonName === 'export') {
                    this.romView.saveRomAsDownload();
                }
            }
        });

        this.romView.events.subscribe({
            offsetChanged: offset => this.statusBar.setOffsetValue(offset),
        });

        palView.events.subscribe({
            primaryColorSelected: () => this.eventManager.raise('primaryColorSelected'),
            secondaryColorSelected: () => this.eventManager.raise('secondaryColorSelected'),
            paletteModified: () => this.eventManager.raise('paletteModified'),
        });

        this.statusBar.events.subscribe({
            scroll: (unit, dir) => {
                this.romView.scrollView(dir, unit);
            }
        });

        // Etc
        this.eventManager.raise('primaryColorSelected');
        this.eventManager.raise('secondaryColorSelected');

        window.addEventListener('resize', e => this.performLayout());

        var swatches = new SwatchGrid();
        swatches.loadSwatches(
            SwatchPaletteCue.rrggbbToRGBA(((nesCodec.paletteCue as SwatchPaletteCue).rrggbb)),
            14);
        var mahModal = new DemoModal();
        swatches.site(mahModal);
        mahModal.showModal();
    }

    private loadRom(file: File) {
        this.romView.loadRom(new ROM(file), tileCodecs.nesCodec, this.docEditor);
        this.romView.setViewOffset(0);
        this.performLayout();
    }

    private performLayout() {
        var containerHeight = this.appContainer.getBoundingClientRect().height;
        var availHeight = containerHeight -
            this.toolbar.element.getBoundingClientRect().height -
            this.statusBar.element.getBoundingClientRect().height;
        this.romView.resize(availHeight);
    }
}

// function $_(selector: string) { return $(selector) as HTMLElement };

// function onRomLoaded(file: File, doc: DocumentEditor) {
//     var romView = ((window as any).romView as RomView);
//     romView.loadRom(new ROM(file), tileCodecs.nesCodec, doc);
//     romView.setViewOffset(0);

//     $_('.offset-page-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.page);
//     $_('.offset-row-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.row);
//     $_('.offset-tile-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.tile);
//     $_('.offset-byte-up').onclick = e => romView.scrollView(Direction.up, ViewUnit.byte);
//     $_('.offset-byte-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.byte);
//     $_('.offset-tile-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.tile);
//     $_('.offset-row-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.row);
//     $_('.offset-page-down').onclick = e => romView.scrollView(Direction.down, ViewUnit.page);
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