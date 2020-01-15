import { ROM } from "../rom";
import { GfxView } from "./gfxView";
import { TileView, TileViewMetrics } from './TileView';
import { $ } from "../dollar";
import { TileCodec } from "../gfx/tileCodec";
import { Palette, debugPalette } from "../gfx/palette";
import { Arrayish, Direction, saveBlob } from "../util";
import { siteChild, Site } from "../site";
import { EventManager, EventSubscription } from '../eventManager';
import { PaletteView, MiniPaletteView } from "../paletteView";
import { ScrollWidget, ScrollbarValueEvent } from "../scrollWidget";
import { Pxl8Toolbar } from "./pxl8Toolbars";
import { DocumentEvents, DocumentEditor } from "../document";
import { TileArranger } from "./tileArranger";

const tileViewZoom = 32;
const gfxViewZoom = 2;

export enum ViewUnit {
    "byte" = "byte",
    "tile" = "tile",
    "row" = "row",
    "page" = "page",
}

/** 
 * Provides an interface composed of a GfxView, a TileView, and a PalettView.
 * 
 */
export class RomView {
    gfxView = new GfxView();
    tileView = new TileView();
    tileArranger = new TileArranger();
    // palView = new MiniPaletteView();
    element = $.create('div');
    scroll = new ScrollWidget();
    // private offsetDisplay = $.create('p');
    // private statusPane = $.create('div');

    private rom: ROM | null = null;
    private codec: TileCodec | null = null;
    // private palette: Palette = debugPalette;
    private viewOffset = 0;
    private tileViewOffset = 0;
    private renderReady = false;
    private romBuffer: Uint8Array;
    private viewableByteCount = 0;
    private romLoaded = false;

    // private listeners: RomViewEvents[] = [];
    private readonly eventMgr: EventManager<RomViewEvents>;
    public readonly events: EventSubscription<RomViewEvents>;

    private document = null as DocumentEditor | null;

    constructor() {
        // this.gfxView = new GfxView();
        // this.tileView = new TileView();
        // this.palView = new PaletteView();
        // this.scroll = new Scrollbar();
        // this.element = $.create('div');
        this.romBuffer = new Uint8Array(1);

        // this.statusPane.style.display = 'inline-block';

        this.eventMgr = new EventManager<RomViewEvents>();
        this.events = this.eventMgr.subscriber;

        // this.palView.element.style.display = 'inline-block';

        // this.palView.events.subscribe({
        //     paletteModified: () => {
        //         var newPal = this.palView.getPalette();
        //         this.gfxView.palette = newPal; 
        //         this.gfxView.displayOffset(this.viewOffset);
        //         this.tileView.palette = newPal;
        //         this.tileView.redraw();
        //     },
        //     colorSelected: () => {
        //         this.tileView.selectedColor = this.palView.getPrimarySelection();
        //     }
        // });
        this.tileView.on({
            commitChanges: () => {
                this.commitTileEdit();
            },
        });
        this.gfxView.events.subscribe({
            tilePicked: index => {
                this.popOutTile(index);
                this.openTileForEdit(index);
            }
        });
        this.scroll.on({
            // pageUp: () => this.scrollView(Direction.up, ViewUnit.page),
            // pageDown: () => this.scrollView(Direction.down, ViewUnit.page),
            // tickUp: () => this.scrollView(Direction.up, ViewUnit.row),
            // tickDown: () => this.scrollView(Direction.down, ViewUnit.row),
            previewChange: e => this.previewScrollChange(e),
            valueChanged: val => this.onScrollValueChange(val),
        });

        // this.tileView.element.style.marginLeft = '4px';
        // this.tileView.element.style.marginTop = '4px';
        this.element.style.height = '100%';
        this.element.style.position = 'relative';

        this.tileView.element.style.position = 'absolute';
        this.tileView.element.style.top = '0px';

        this.gfxView.selection.events.subscribe({
            // queryOffset: query => query.offset = this.viewOffset
            queryOffset: q => {
                q.offset = this.viewOffset;
            }
        });
    }   

    private readonly documentEvents: DocumentEvents = {
        paletteModified: () => {
            var newPal = this.document!.getPalette();
            this.gfxView.palette = newPal; 
            this.gfxView.displayOffset(this.viewOffset);
            this.tileView.palette = newPal;
            this.tileArranger.setPalette(newPal);
            this.tileView.redraw();
        },
        primaryColorSelected: () => {
            this.tileView.primaryColor = this.document!.getPrimaryColor();
        },
        secondaryColorSelected: () => {
            this.tileView.secondaryColor = this.document!.getSecondaryColor();
        },

    }

    site(site: Site) {
        var thisSite = { site: this.element };
        this.gfxView.site(thisSite);
        this.scroll.site(thisSite);
        this.tileView.site(thisSite);
        this.tileArranger.site(thisSite);
        // this.element.appendChild($.create('br'));
        // this.palView.site(thisSite);
        // this.element.appendChild(this.statusPane);
        siteChild(this.element, site);
    }

    loadRom(rom: ROM, codec: TileCodec, editor: DocumentEditor) {
        const gridHeight = 16;

        if (this.document) this.document.events.unsubscribe(this.documentEvents);
        this.document = editor;
        if (this.document) this.document.events.subscribe(this.documentEvents);

        this.romLoaded = false;
        this.rom = rom;
        this.codec = codec;

        this.scroll.setSize(gfxViewZoom * codec.tileHeight * gridHeight);

        this.tileView.initialize({
            pixelWidth: tileViewZoom,
            pixelHeight: tileViewZoom,
            tileWidth: codec.tileWidth,
            tileHeight: codec.tileHeight,
        });

        this.gfxView.initialize({
            pixelWidth: gfxViewZoom,
            pixelHeight: gfxViewZoom,
            tileWidth: codec.tileWidth,
            tileHeight: codec.tileHeight,
            gridWidth: 16,
            gridHeight: gridHeight,
        });

        this.tileArranger.rom = rom;
        this.tileArranger.codec = codec;

        this.viewableByteCount = this.gfxView.metrics.gridWidth * this.gfxView.metrics.gridHeight * this.codec.bytesPerTile;
        this.romBuffer = new Uint8Array(this.viewableByteCount);

        this.rom.rawDataPromise.then(() => this.romLoaded = true);
        this.performLayout();
    }

    private openTileForEdit(tileIndex: number) {
        if (!this.rom) return;

        if (!this.romLoaded) {
            this.rom.rawDataPromise.then(() => this.openTileForEdit(tileIndex));
        } else {
            if (this.isRenderReady()) {
                var tileOffset = this.viewOffset + tileIndex * this.codec!.bytesPerTile;
                var nextTileOffset = tileOffset + this.codec!.bytesPerTile;
                var inBounds = tileOffset >= 0 && nextTileOffset <= this.rom.length;

                if (inBounds) {
                    this.tileViewOffset = tileOffset;
                    this.codec!.decode(
                        { data: this.rom.rawData!, offset: this.tileViewOffset }, // src
                        { data: this.tileView.pixels, offset: 0 }); // dest
                    this.tileView.redraw();
                }
            } else {
                console.warn('Not ready for render in openTileForEdit');
            }    
        }
    }
    private popOutTile(tileIndex: number) {
        var tileOffset = this.viewOffset + tileIndex * this.codec!.bytesPerTile;
        
        console.log('cheese');
        this.tileArranger.addView(tileOffset);
    }

    private previewScrollChange(e: ScrollbarValueEvent) {
        if (this.codec && this.rom) {
            var proposedValue = e.value || 0;
            var bytesPerRow = this.codec.bytesPerTile * this.gfxView.metrics.gridWidth;
            var curAlignment = this.viewOffset % bytesPerRow;
            var proposedAlignment = proposedValue % bytesPerRow;
            var finalValue = proposedValue - proposedAlignment + curAlignment;
            
            while (finalValue >= this.rom.length) finalValue -= bytesPerRow;
            while (finalValue < 0) finalValue += bytesPerRow;
            if (finalValue >= this.rom.length) finalValue = 0;

            e.value = finalValue;
        }
    }
    private onScrollValueChange(value: number) {
        this.setViewOffset(value);
    }

    scrollView(dir: Direction, unit: ViewUnit) {
        var amt = 1;

        if (dir === Direction.up) {
            amt = -1;    
        } else if (dir !== Direction.down) {
            console.error(Error('Invalid direction specified'));
        }

        const bytesPerRow = this.codec!.bytesPerTile * this.gfxView.metrics.gridWidth;
        if (unit === ViewUnit.tile) {
            amt *= this.codec!.bytesPerTile;
        } else if (unit === ViewUnit.row) {
            amt *= bytesPerRow;
        } else if (unit === ViewUnit.page) {
            amt *= bytesPerRow * this.gfxView.metrics.gridHeight;
        } else if (unit !== ViewUnit.byte) {
            console.error(Error('Unsupported unit specified'));
        }
       
        var newOffset = this.viewOffset + amt;
        if (newOffset >= this.rom!.rawData!.length - bytesPerRow){
            newOffset = this.rom!.rawData!.length - bytesPerRow;
        }
        if (newOffset < 0) newOffset = 0;
        this.setViewOffset(newOffset);
    }

    setViewOffset(offset: number) {
        if (!this.rom) return;

        if (!this.romLoaded) {
            this.rom.rawDataPromise.then(() => this.setViewOffset(offset));
        } else {
            this.viewOffset = offset;
            this.eventMgr.raise('offsetChanged', offset);
            // this.tileViewOffset = this.viewOffset + 0x10;
            if (this.isRenderReady()) {
                var dataBytes = this.rom.rawData!; // this.romLoaded indicates raw data was loaded
                this.gfxView.gfxData = dataBytes;
                this.gfxView.displayOffset(this.viewOffset);
                
                var pixelData = this.tileView.pixels;
                this.codec!.decode({ data: dataBytes, offset: this.tileViewOffset }, { data: pixelData, offset: 0 });
                this.tileView.redraw();

                this.scroll.setValue(offset);
                this.gfxView.selection.updateSelectionUi();
                // this.scroll.setValue(offset / dataBytes.length);
            } else {
                console.warn('RomView not ready to render.');
            }
        }
    }

    /** Forces all tiles to be re-renderd */
    refreshData() {
        this.gfxView.displayOffset(this.viewOffset);
        this.tileView.redraw();
    }

    private fetchRomData(offset: number) {
        return this.rom!.getData(offset, this.viewableByteCount);
    }

    private isRenderReady() {
        if (this.renderReady) return true;

        var { codec, rom } = this;
        if (codec == null || rom == null) return false;

        var palette = this.document!.getPalette();
        this.tileView.palette = palette;
        this.gfxView.palette = palette;
        this.gfxView.codec = codec;
        return true;
    }

    private commitTileEdit() {
        if (!this.codec) return;
        var offset = this.tileViewOffset - this.viewOffset;
        var tileData = this.tileView.pixels;

        this.codec.encode({ data: tileData, offset: 0 }, { data: this.rom!.rawData!, offset: this.tileViewOffset });
        var index = Math.floor(offset / this.codec.bytesPerTile);
        this.gfxView.refreshTile(this.viewOffset, this.tileViewOffset - this.viewOffset);
    }

    // private onSave(e: Event) {
    //     e.preventDefault();
    //     this.saveRomAsDownload();
    // }

    public saveRomAsDownload() {
        var blob = new Blob([this.rom!.rawData!]);
        var filename = this.rom!.filename;
        saveBlob(blob, filename);
    }

    public resize(height: number) {
        this.performLayout(height);
    }
    private performLayout(height?: number) {
        if (height === undefined) height = this.element.offsetHeight;
        
        this.gfxView.resize(height);
        if (this.romLoaded) {
            this.gfxView.displayOffset(this.viewOffset);
        }
        this.scroll.setSize(height);
        if (this.rom && this.codec) {
            var rowSize = this.codec.bytesPerTile * this.gfxView.metrics.gridWidth;
            var pageSize = this.gfxView.metrics.gridHeight * rowSize;
            // var tileCount = this.rom.length / this.codec.bytesPerTile;
            // var tilesPerRow = this.gfxView.metrics.gridWidth;
            // var rowCount = Math.floor((tileCount + tilesPerRow - 1) / tilesPerRow);
            this.scroll.setRange(this.rom.length, rowSize, pageSize);
        }

        var scrollRect = this.scroll.element.getBoundingClientRect();
        this.tileArranger.setStyle({
            position: 'absolute',
            left: scrollRect.right + 'px',
            top: '0px', // scrollRect.top + 'px',
            width: document.documentElement.clientWidth - scrollRect.right + 'px',
            height: scrollRect.height + 'px',
        });
    }
}

export interface RomViewEvents {
    tilePicked?: (arg: { relativeIndex: number, offset: number }) => void;
    test?: (arg: number, arg2: string) => void;
    tesy?: (arg: string) => void;
    offsetChanged?: (offset: number) => void;
}
// type EventHandler<T extends keyof RomViewEvents> = NonNullable<RomViewEvents[T]>
// type EventArg<T extends keyof RomViewEvents> = Parameters<EventHandler<T>>[0];

