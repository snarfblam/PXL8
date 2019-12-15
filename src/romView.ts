import { ROM } from "./rom";
import { GfxView } from "./gfxView";
import { TileView, TileViewMetrics } from './TileView';
import { $ } from "./dollar";
import { TileCodec } from "./gfx/tileCodec";
import { Palette, debugPalette } from "./gfx/palette";
import { Arrayish } from "./util";
import { SiteChild, Site } from "./site";
import { EventManager, EventSubscription } from './eventManager';
import { PaletteView } from "./paletteView";

const tileViewZoom = 8;
const gfxViewZoom = 2;

/** Provides an interface composed of a GfxView, a TileView, and a PalettView. */
export class RomView {
    gfxView: GfxView;
    tileView: TileView;
    palView: PaletteView;
    element: HTMLElement;

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
        this.gfxView = new GfxView();
        this.tileView = new TileView();
        this.palView = new PaletteView();
        this.romBuffer = new Uint8Array(1);
        this.element = $.create('div');

        this.eventMgr = new EventManager<RomViewEvents>();
        this.events = this.eventMgr.subscriber;

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
    }   

    // addListener(listener: RomViewEvents) {
    //     this.listeners.push(listener);
    // }

    // removeListener(listener: RomViewEvents) {
    //     var index = this.listeners.indexOf(listener);
    //     if (index >= 0) this.listeners = this.listeners.splice(index, 1);
    // }

    // private raise<T extends keyof RomViewEvents>(eventName: T, args: EventArg<T>) {
    //     this.listeners.forEach(l => {
    //         var handler = l[eventName];
    //         if (handler) handler(args as any as never);
    //     });

    // }

    site(site: Site) {
        var thisSite = { site: this.element };
        this.gfxView.site(thisSite);
        this.tileView.site(thisSite);
        this.palView.site(thisSite);
        SiteChild(this.element, site);
    }

    loadRom(rom: ROM, codec: TileCodec) {
        this.romLoaded = false;
        this.rom = rom;
        this.codec = codec;

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
            gridHeight: 16,
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
}

export interface RomViewEvents {
    tilePicked?: (arg: { relativeIndex: number, offset: number }) => void;
    test?: (arg: number) => void;
    tesy?: (arg: string) => void;
}
// type EventHandler<T extends keyof RomViewEvents> = NonNullable<RomViewEvents[T]>
// type EventArg<T extends keyof RomViewEvents> = Parameters<EventHandler<T>>[0];

