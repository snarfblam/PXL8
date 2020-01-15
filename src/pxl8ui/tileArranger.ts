import { Widget } from '../widgets/widget';
import { TileView } from './TileView';
import { TileCodec, nullCodec } from '../gfx/tileCodec';
import { ROM, nullRom } from '../rom';
import { RGBA, Palette, debugPalette } from '../gfx/palette';
import { $ } from '../dollar';
import { Site } from '../site';

export interface TileArrangerEvents{
    x: () => void;
}

interface ArrangerView {
    view: TileView;
    offset: number;
    location: { x: number, y: number };
    decoration: HTMLElement;
}

function createDecorationElement() {
    var decoration = $.create('div');
    return decoration;
}

function positionViewDecoration(view: ArrangerView) {
    
}

export class TileArranger extends Widget<TileArrangerEvents>{
    currentScale = 4;
    private palette: Palette = debugPalette; // private because when set, we need to redraw all our arrangers
    views: ArrangerView[] = [];
    rom: ROM = nullRom;
    codec: TileCodec = nullCodec;

    constructor() {
        super(true);

        this.setStyle('position', 'absolute');
    }

    addView(offset: number) {
        var view = new TileView();
        view.initialize({
            pixelWidth: this.currentScale,
            pixelHeight: this.currentScale,
            tileWidth: this.codec.tileWidth,
            tileHeight: this.codec.tileHeight,
        });
        view.palette = this.palette;
        view.makeDraggable();
        view.setStyle({ left: '256px', top: '256px', position: 'absolute', });


        view.site(Site(this));
        var newView = {
            view, offset,
            decoration: createDecorationElement()
        }
        this.views.push(newView);
        positionViewDecoration(newView);
        this.renderView(newView);
    }

    setPalette(pal: Palette) {
        this.palette = pal;
        this.views.forEach(entry => entry.view.palette = pal);
    }

    private renderView(view: ArrangerView) {
        var pixelData = view.view.pixels;
        var romData = this.rom.rawData;
        if (romData) {
            this.codec.decode({ data: romData, offset: view.offset }, { data: pixelData, offset: 0 });
            view.view.redraw();
        }
    }
}