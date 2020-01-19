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
import {  } from '../math';

export interface TileArrangerEvents{
    commitChanges?: (data: TileData, offset: number) => void;
}

const validArrangerScales = [1, 2, 4, 8, 16];
interface ArrangerView {
    view: TileView;
    offset: number;
    location: { tx: number, ty: number };
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
        this.setViewMetrics(view);
        view.palette = this.palette;
        view.setLayer(layers.floatingViews);
        view.makeDraggable();

        var newView: ArrangerView = {
            view, offset,
            decoration: createDecorationElement(),
            location: { tx: 0, ty: 0 },
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
        this.positionView(newView);
        this.renderView(newView);

        view.on(newView.eventHandler);
        this.positionView(newView);

    }

    onViewDragged(view: ArrangerView, dx: number, dy: number) {
        view.location.tx += dx; // * view.view.element.offsetWidth;
        view.location.ty += dy; // * view.view.element.offsetHeight;
        this.positionView(view);
    }

    setPalette(pal: Palette) {
        this.palette = pal;
        this.views.forEach(entry => {
            entry.view.palette = pal;
            entry.view.redraw();
        });
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

    zoomOut() {
        this.setScale(this.currentScale / 2);
    }

    zoomIn() {
        this.setScale(this.currentScale * 2);
    }
    /**
     * Sets the scale (zoom) of the view.
     * @param proposedScale The desired scale 
     * @returns The new scale value
     */
    setScale(proposedScale: number) {
        var usedScale = proposedScale | 0; // truncate
        usedScale = Math.max(1, usedScale);
        usedScale = Math.min(16, usedScale);
        var valid = validArrangerScales.indexOf(usedScale) !== -1;
        if (!valid) usedScale = this.currentScale;
        
        this.currentScale = usedScale;
        this.views.forEach(view => {
            this.setViewMetrics(view.view);
            this.positionView(view);
            this.renderView(view);
        });
            
        return usedScale;
    }

    private setViewMetrics(view: TileView) {
        view.initialize({
            pixelWidth: this.currentScale,
            pixelHeight: this.currentScale,
            tileWidth: this.codec.tileWidth,
            tileHeight: this.codec.tileHeight,
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

    
    private positionView(view: ArrangerView) {
        var viewWidth = this.element.offsetWidth;
        var viewHeight = this.element.offsetHeight;

        var vx = view.location.tx * this.codec.tileWidth * this.currentScale +
            this.viewOrigin.x;
        var vy = view.location.ty * this.codec.tileHeight * this.currentScale +
            this.viewOrigin.y;
        var vr = vx + view.view.element.offsetWidth - 1;
        var vb = vy + view.view.element.offsetHeight - 1;
        




        view.view.setStyle({
            left: vx.toString() + 'px',
            top: vy.toString() + 'px'
        });

        // For the sake of positioning the decoration, clamp the position to
        // the viewport edges (borders remain visible as a cue to user that
        // there is something OOB)
        var minVx = -view.view.element.offsetWidth;
        var minVy = -view.view.element.offsetHeight;
        var maxVx = this.element.offsetWidth;
        var maxVy = this.element.offsetHeight;

        vx = Math.max(Math.min(maxVx, vx), minVx);
        vy = Math.max(Math.min(maxVy, vy), minVy);

        // We will use the 'decoration' element to cue the user if the view is
        // outside the visible bounds or behind the main tile view
        var viewOOB = vx > viewWidth || vr < 0 || vy > viewHeight || vb < 0;
        var viewBehindTileView = vr < this.viewOrigin.x && vb < this.viewOrigin.y;

        var currentStyle = getComputedStyle(view.decoration);
        var borderLeftWidth = parseInt(currentStyle.borderLeftWidth as any) || 0;
        var borderTopWidth = parseInt(currentStyle.borderTopWidth as any) || 0;

        // if (viewBehindTileView) {
        //     console.log('behind');
        // } else if (viewOOB) {
        //     var minX = 
        // } else {
            var currentStyle = getComputedStyle(view.decoration);
            var borderLeftWidth = parseInt(currentStyle.borderLeftWidth as any) || 0;
            var borderTopWidth = parseInt(currentStyle.borderTopWidth as any) || 0;
            view.decoration.style.left = (vx - borderLeftWidth) + 'px';
            view.decoration.style.top = (vy - borderTopWidth) + 'px';
            view.decoration.style.width = view.view.element.offsetWidth + 'px';
            view.decoration.style.height = view.view.element.offsetHeight + 'px';
            ZLayer.setLayer(view.decoration, layers.floatingViewDecorations);
        // }
    }
}