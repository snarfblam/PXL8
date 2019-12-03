import { ROM } from "./rom";
import { GfxView } from "./gfxView";
import { TileView, TileViewMetrics } from './TileView';
import { $ } from "./dollar";
import { TileCodec } from "./gfx/tileCodec";
import { Palette, debugPalette } from "./gfx/palette";
import { Arrayish } from "./util";
import { SiteChild, Site } from "./site";

const tileViewZoom = 8;
const gfxViewZoom = 2;

/** Provides an interface composed of a GfxView, a TileView, and a PalettView. */
export class RomView {
    gfxView: GfxView;
    tileView: TileView;
    element: HTMLElement;

    private rom: ROM | null = null;
    private codec: TileCodec | null = null;
    private palette: Palette = debugPalette;
    private viewOffset = 0;
    private renderReady = false;
    private romBuffer: Uint8Array;
    private viewableByteCount = 0;

    private listeners: RomViewEvents[] = [];
    
    constructor() {
        this.gfxView = new GfxView();
        this.tileView = new TileView();
        this.romBuffer = new Uint8Array(1);
        this.element = $.create('div');
    }   

    addListener(listener: RomViewEvents) {
        this.listeners.push(listener);
    }

    removeListener(listener: RomViewEvents) {
        var index = this.listeners.indexOf(listener);
        if (index >= 0) this.listeners = this.listeners.splice(index, 1);
    }

    private raise<T extends keyof RomViewEvents>(eventName: T, args: RomViewEvents[T]) {
        this.listeners.forEach(l => {
            var handler = l[eventName];
            if (handler) handler(args);
        });
    }

    site(site: Site) {
        var thisSite = { site: this.element };
        this.gfxView.site(thisSite);
        this.tileView.site(thisSite);
        SiteChild(this.element, site);
    }

    loadRom(rom: ROM, codec: TileCodec) {
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

        this.viewableByteCount = this.gfxView.metrics.gridWidth * this.gfxView.metrics.gridHeight * this.codec.bytesPerTile;
        this.romBuffer = new Uint8Array(this.viewableByteCount);
    }

    setViewOffset(offset: number) {
        this.viewOffset = offset;
        if (this.isRenderReady()) { 
            var doFetch = this.fetchRomData(offset);
            doFetch.then((data) => {
                var dataBytes = new Uint8Array(data);
                console.log('fatched');
                this.gfxView.gfxData = dataBytes;
                this.gfxView.displayOffset(0);
                
                var pixelData = this.tileView.pixels;
                this.codec!.decode({ data: dataBytes, offset: 0x10 }, { data: pixelData, offset: 0 });
                this.tileView.redraw();
            });
        } else {
            console.warn('RomView not ready to render.');
        }
    }

    private fetchRomData(offset: number) {
        return this.rom!.getData(offset, this.viewableByteCount);
    }

    private isRenderReady() {
        if (this.renderReady) return true;

        var { codec, palette, rom } = this;
        if (codec == null || palette == null || rom == null) return false;

        this.tileView.palette = palette;
        this.gfxView.palette = palette;
        this.gfxView.codec = codec;
        return true;
    }
}

export interface RomViewEvents {
    tilePicked?: (arg: { relativeIndex: number, offset: number }) =>void;
    dogs?: (arg: number) => void;
}

type RomViewEventName = keyof RomViewEvents;