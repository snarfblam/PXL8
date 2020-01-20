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

import { $, $$ } from './dollar';
import { tileCodecs, SwatchPaletteCue, TileCodec, PaletteCue } from './gfx/tileCodec';
import { debugPalette } from './gfx/palette';
import { RomView, ViewUnit } from './pxl8ui/romView';
import { ROM } from './rom';
import { Pxl8Toolbar, Pxl8StatusBar } from './pxl8ui/pxl8Toolbars';
import { Site } from './site';
import { showFileDialog } from './fileDialog';
import { DocumentEvents, DocumentEditor } from './document';
import { EventManager } from './eventManager';
import { Modal, ModalHost } from './widgets/modal';
import { SwatchModal } from './pxl8ui/swatchModal';
import { ColorPicker } from './pxl8ui/colorPicker';
import { layers } from './pxl8ui/pxlLayers';
import { ZLayer } from './widgets/zlayer';
import { InputModal } from './pxl8ui/inputModal';


class Pxl8 {
    private readonly appContainer = $('.app-container') as HTMLElement;
    private readonly eventManager = new EventManager<DocumentEvents>();
    private readonly toolbar = new Pxl8Toolbar();
    private readonly statusBar = new Pxl8StatusBar();
    private readonly romView = new RomView();
    private readonly docEditor: DocumentEditor;
    private readonly helpModal = new InputModal();
    private clipboardData: Uint8Array | null = null;

    private rom: ROM | null = null;

    /** The tile codec the currently loaded color picker is for, or null if no picker is loaded. */
    private colorPickerCodec: TileCodec | null = null;
    private colorPicker: (ColorPicker & Modal<{}>) | null = null;
    private currentCodec: TileCodec | null = null;

    public readonly events = this.eventManager.subscriber;

    constructor() {
        var palView = this.getPaletteView();
        var arranger = this.romView.tileArranger;

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
        this.toolbar.on({
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
                if (buttonName === 'copy') {
                    this.performCopy();
                }
                if (buttonName === 'paste') {
                    this.performPaste();
                }
                if (buttonName === 'zoomin') {
                    arranger.zoomIn();
                }
                if (buttonName === 'zoomout') {
                    arranger.zoomOut();                    
                }
                if (buttonName === 'help') {
                    this.helpModal.showModal();
                }
            }
        });

        this.romView.events.subscribe({
            offsetChanged: offset => this.statusBar.setOffsetValue(offset),
        });

        palView.on({
            primaryColorSelected: () => this.eventManager.raise('primaryColorSelected'),
            secondaryColorSelected: () => this.eventManager.raise('secondaryColorSelected'),
            paletteModified: () => this.eventManager.raise('paletteModified'),
            colorEditRequest: (index) => this.editPalEntry(index),
        });

        this.statusBar.on({
            scroll: (unit, dir) => {
                this.romView.scrollView(dir, unit);
            }
        });

        // Etc
        this.eventManager.raise('primaryColorSelected');
        this.eventManager.raise('secondaryColorSelected');

        window.addEventListener('resize', e => this.performLayout());

        this.setupLayers();
    }

    private setupLayers() {
        this.toolbar.setLayer(layers.chrome, true);
        this.statusBar.setLayer(layers.chrome, true);
        ZLayer.setLayer(this.romView.gfxView.element, layers.fixedViews, true);
        ZLayer.setLayer(this.romView.tileView.element, layers.fixedViews, true);
        this.romView.scroll.setLayer(layers.fixedViews);
        this.romView.gfxView.selection.setSelectionStyle({
            zIndex: ZLayer.getZIndex(layers.fixedViews)!.toString(),
        });
        ModalHost.getGlobalHost().setLayer(layers.modalHost);
    }

    private loadRom(file: File) {
        this.currentCodec = tileCodecs.nesCodec;
        this.rom = new ROM(file);
        this.romView.loadRom(this.rom, this.currentCodec, this.docEditor);
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

    private editPalEntry(index: number) {
        if (!this.colorPicker || this.colorPickerCodec !== this.currentCodec) {
            this.loadColorPicker();
        }

        var prevColor = this.getPaletteView().getColor(index);
        var showEditorPromise = this.colorPicker!.editColor(prevColor);
        showEditorPromise.then(color => {
            if (color) {
                var pal = this.getPaletteView().getPalette();
                pal[index] = color;
                this.getPaletteView().setPalette(pal);
                this.eventManager.raise('paletteModified');
            }
        });
    }

    private loadColorPicker() {
        if (this.colorPicker) {
            this.colorPicker.dispose();
        }

        this.colorPickerCodec = this.currentCodec;
        var cue = this.currentCodec!.paletteCue || PaletteCue.default;
        if (cue.type === 'swatches') {
            var picker = new SwatchModal();
            picker.loadSwatchesFor(this.currentCodec!);
            this.colorPicker = picker;
        } else {
            throw Error('Color picker not implemented for cue type: ' + cue.type);
        }
    }

    private getPaletteView() {
        return this.statusBar.getPaletteView();
    }

    performCopy() {
        var selection = this.romView.gfxView.selection.getSelectionRange();
        // Don't try to copy from beyond end of ROM
        var selEnd = selection.firstTile + selection.byteCount;
        if (this.rom) selEnd = Math.min(this.rom!.length, selEnd);
        var selLen = selEnd - selection.firstTile;
        // Don't try to copy partial tiles
        if (this.currentCodec) {
            var misalign = selLen % this.currentCodec.bytesPerTile;
            selLen -= misalign;
        }

        if (this.rom && this.rom.rawData) {
            var data = this.rom.rawData;
            var buffer = data.buffer;
            var selDataStart = data.byteOffset + selection.firstTile;
            var selDataEnd = data.byteOffset + selEnd;
            var clipboardBuffer = buffer.slice(selDataStart, selDataEnd);
            this.clipboardData = new Uint8Array(clipboardBuffer);
        } else {
            this.warnUser("Could not copy the selection. ROM data is not ready.");
        }
    }

    performPaste() {
        var clipData = this.clipboardData;
        var romData = this.rom && this.rom.rawData;
        if (clipData) {
            if (romData) {
                var selection = this.romView.gfxView.selection.getSelectionRange();
                // Don't try to copy from beyond end of ROM
                var pasteEnd = selection.firstTile + clipData.byteLength;
                pasteEnd = Math.min(romData.length, pasteEnd);
                var pasteLen = pasteEnd - selection.firstTile;

                var dest = selection.firstTile;
                for (var i = 0; i < pasteLen; i++){
                    romData[dest + i] = clipData[i];
                }

                this.refreshData();
            } else {
                this.warnUser("Could not paste. ROM data is not ready.");
            }
        } else {
            this.warnUser("Could not paste. The clipboard is empty.");
        }
    }

    /** 
     * Redraws tiles. Call this method while tile data is modified programatically
     * in a way that does not automatically update the rendered tiles.
     */
    refreshData() {
        this.romView.refreshData();
    }

    warnUser(msg: string) {
        console.warn(msg);
        // Todo: pop-up warnings for user
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