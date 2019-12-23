import { ROM } from "./rom";
import { GfxView } from "./gfxView";
import { TileView, TileViewMetrics } from './TileView';
import { $ } from "./dollar";
import { TileCodec } from "./gfx/tileCodec";
import { Palette, debugPalette } from "./gfx/palette";
import { Arrayish, Direction, saveBlob } from "./util";
import { siteChild, Site } from "./site";
import { EventManager, EventSubscription } from './eventManager';
import { PaletteView } from "./paletteView";
import { Scrollbar } from "./scrollbar";
import { Pxl8Toolbar } from "./pxl8Toolbar";

const tileViewZoom = 32;
const gfxViewZoom = 2;

export enum ViewUnit {
    "byte" = "byte",
    "tile" = "tile",
    "row" = "row",
    "page" = "page",
}

/** Provides an interface composed of a GfxView, a TileView, and a PalettView. */
export class RomView {
    gfxView = new GfxView();
    tileView = new TileView();
    palView = new PaletteView();
    element = $.create('div');
    scroll = new Scrollbar();
    private offsetDisplay = $.create('p');
    private saveLink = $.create('a') as HTMLAnchorElement;
    private statusPane = $.create('div');

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
    
    constructor() {
        // this.gfxView = new GfxView();
        // this.tileView = new TileView();
        // this.palView = new PaletteView();
        // this.scroll = new Scrollbar();
        // this.element = $.create('div');
        this.romBuffer = new Uint8Array(1);

        this.statusPane.style.display = 'inline-block';
        this.offsetDisplay.textContent = "No ROM loaded";
        this.saveLink.textContent = "Click to save";
        this.saveLink.href = '#';
        this.saveLink.onclick = e => this.onSave(e);

        this.eventMgr = new EventManager<RomViewEvents>();
        this.events = this.eventMgr.subscriber;

        this.palView.element.style.display = 'inline-block';

        this.palView.events.subscribe({
            paletteModified: () => {
                var newPal = this.palView.getPalette();
                this.gfxView.palette = newPal; 
                this.gfxView.displayOffset(this.viewOffset);
                this.tileView.palette = newPal;
                this.tileView.redraw();
            },
            colorSelected: () => {
                this.tileView.selectedColor = this.palView.getPrimarySelection();
            }
        });
        this.tileView.events.subscribe({
            commitChanges: () => {
                this.commitTileEdit();
            },
        });
        this.gfxView.events.subscribe({
            tilePicked: index => this.openTileForEdit(index)
        });
        this.scroll.events.subscribe({
            pageUp: () => this.scrollView(Direction.up, ViewUnit.page),
            pageDown: () => this.scrollView(Direction.down, ViewUnit.page),
            tickUp: () => this.scrollView(Direction.up, ViewUnit.row),
            tickDown: () => this.scrollView(Direction.down, ViewUnit.row),
        });

        this.tileView.element.style.marginLeft = '8px';
    }   

    site(site: Site) {
        this.statusPane.appendChild(this.offsetDisplay);
        this.statusPane.appendChild(this.saveLink);

        var thisSite = { site: this.element };
        this.scroll.site(thisSite);
        this.gfxView.site(thisSite);
        this.tileView.site(thisSite);
        this.element.appendChild($.create('br'));
        this.palView.site(thisSite);
        this.element.appendChild(this.statusPane);
        siteChild(this.element, site);
    }

    loadRom(rom: ROM, codec: TileCodec) {
        const gridHeight = 16;

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

        this.palView.setPalette(debugPalette);

        this.viewableByteCount = this.gfxView.metrics.gridWidth * this.gfxView.metrics.gridHeight * this.codec.bytesPerTile;
        this.romBuffer = new Uint8Array(this.viewableByteCount);

        this.rom.rawDataPromise.then(() => this.romLoaded = true);
    }

    private openTileForEdit(tileIndex: number) {
        if (!this.rom) return;

        if (!this.romLoaded) {
            this.rom.rawDataPromise.then(() => this.openTileForEdit(tileIndex));
        } else {
            if (this.isRenderReady()) {
                this.tileViewOffset = this.viewOffset + tileIndex * this.codec!.bytesPerTile;
                this.codec!.decode(
                    { data: this.rom.rawData!, offset: this.tileViewOffset }, // src
                    { data: this.tileView.pixels, offset: 0 }); // dest
                this.tileView.redraw();
            } else {
                console.warn('Not ready for render in openTileForEdit');
            }    
        }
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
        console.log('Scrolling to: $' + newOffset.toString(16).toUpperCase());
        this.setViewOffset(newOffset);
    }

    setViewOffset(offset: number) {
        if (!this.rom) return;

        if (!this.romLoaded) {
            this.rom.rawDataPromise.then(() => this.setViewOffset(offset));
        } else {
            this.viewOffset = offset;
            this.tileViewOffset = this.viewOffset + 0x10;
            if (this.isRenderReady()) {
                var dataBytes = this.rom.rawData!; // this.romLoaded indicates raw data was loaded
                this.gfxView.gfxData = dataBytes;
                this.gfxView.displayOffset(this.viewOffset);
                
                var pixelData = this.tileView.pixels;
                this.codec!.decode({ data: dataBytes, offset: this.tileViewOffset }, { data: pixelData, offset: 0 });
                this.tileView.redraw();

                this.scroll.setValue(offset / dataBytes.length);
                this.offsetDisplay.textContent = "Offset: $" + offset.toString(16).toUpperCase();
            } else {
                console.warn('RomView not ready to render.');
            }
        }
    }

    private fetchRomData(offset: number) {
        return this.rom!.getData(offset, this.viewableByteCount);
    }

    private isRenderReady() {
        if (this.renderReady) return true;

        var { codec, rom } = this;
        if (codec == null || rom == null) return false;

        var palette = this.palView.getPalette();
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
        this.gfxView.refreshTile(this.viewOffset, index);
    }

    private onSave(e: Event) {
        e.preventDefault();
        var blob = new Blob([this.rom!.rawData!]);
        var filename = this.rom!.filename;
        saveBlob(blob, filename);
    }
}

export interface RomViewEvents {
    tilePicked?: (arg: { relativeIndex: number, offset: number }) => void;
    test?: (arg: number) => void;
    tesy?: (arg: string) => void;
}
// type EventHandler<T extends keyof RomViewEvents> = NonNullable<RomViewEvents[T]>
// type EventArg<T extends keyof RomViewEvents> = Parameters<EventHandler<T>>[0];

