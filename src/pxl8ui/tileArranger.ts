import { Widget } from '../widgets/widget';
import { TileView, TileViewEvents } from './TileView';
import { TileCodec, nullCodec } from '../gfx/tileCodec';
import { ROM, nullRom } from '../rom';
import { RGBA, Palette, debugPalette } from '../gfx/palette';
import { $ } from '../dollar';
import { Site } from '../site';
import { layers } from './pxlLayers';
import { ZLayer } from '../widgets/zlayer';
import { TileData } from '../gfx/TileData';

export interface TileArrangerEvents{
    commitChanges?: (data: TileData, offset: number) => void;
}

interface ArrangerView {
    view: TileView;
    offset: number;
    location: { x: number, y: number };
    decoration: HTMLElement;
    eventHandler: TileViewEvents;
}

function createDecorationElement() {
    var decoration = $.create('div');
    decoration.style.position = ('absolute');
    decoration.style.boxSizing = 'content-box';
    decoration.style.zIndex = ZLayer.getZIndex(layers.floatingViewDecorations) as any;
    decoration.classList.add('pxl8-tileview-decoration');
    return decoration;
}

function positionView(view: ArrangerView) {
    view.view.setStyle({
        left: view.location.x.toString() + 'px',
        top: view.location.y.toString() + 'px'
    });

    var currentStyle = getComputedStyle(view.decoration);
    var borderLeftWidth = parseInt(currentStyle.borderLeftWidth as any) || 0;
    var borderTopWidth = parseInt(currentStyle.borderTopWidth as any) || 0;
    view.decoration.style.left = (view.location.x - borderLeftWidth) + 'px';
    view.decoration.style.top = (view.location.y - borderTopWidth) + 'px';
    view.decoration.style.width = view.view.element.offsetWidth + 'px';
    view.decoration.style.height = view.view.element.offsetHeight + 'px';
}

export class TileArranger extends Widget<TileArrangerEvents>{
    currentScale = 4;
    private palette: Palette = debugPalette; // private because when set, we need to redraw all our arrangers
    views: ArrangerView[] = [];
    rom: ROM = nullRom;
    codec: TileCodec = nullCodec;
    /** 
     * The location within the view that is consizered the origin for the purposes
     * of zooming and the tile grid.
     */
    viewOrigin = { x: 260, y: 260 }; // Todo: calculate instead of hardcoding (depends on codec, zoom, css, etc);

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
        view.setLayer(layers.floatingViews);
        view.makeDraggable();

        var newView: ArrangerView = {
            view, offset,
            decoration: createDecorationElement(),
            location: { x: this.viewOrigin.x, y: this.viewOrigin.y },
            eventHandler: {
                commitChanges: () => {
                    this.raise('commitChanges', view.pixels, offset);
                },
                viewDragged: (dx, dy) => this.onViewDragged(newView, dx, dy) ,
            }
        }
        view.site(Site(this));
        this.element.appendChild(newView.decoration);

        this.views.push(newView);
        view.setStyle({position: 'absolute', });
        positionView(newView);
        this.renderView(newView);

        view.on(newView.eventHandler);
        positionView(newView);

    }

    onViewDragged(view: ArrangerView, dx: number, dy: number) {
        view.location.x += dx * view.view.element.offsetWidth;
        view.location.y += dy * view.view.element.offsetHeight;
        positionView(view);
    }

    setPalette(pal: Palette) {
        this.palette = pal;
        this.views.forEach(entry => entry.view.palette = pal);
    }

    notifyDataChanged(offset: number, size: number) {
        var dataEnd = offset + size;
        var byteSize = this.codec.bytesPerTile;
        this.views.forEach(view => {
            var viewEnd = view.offset + byteSize;
            if (dataEnd > view.offset && offset < viewEnd) {
                this.renderView(view);
            }
        });
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