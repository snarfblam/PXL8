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
import { WidgetMouseEvent } from '../widgets/input';

export interface TileArrangerEvents{
    commitChanges?: (data: TileData, offset: number) => void;
}

const validArrangerScales = [1, 2, 4, 8, 16];
interface ArrangerView {
    view: TileView;
    offset: number;
    outOfBounds: boolean;
    location: { tx: number, ty: number };
    decoration: HTMLElement;
    viewEventHandler: TileViewEvents;
    decorationEventHandler: (e: WidgetMouseEvent) => void;
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
            outOfBounds: false,
            decoration: createDecorationElement(),
            location: { tx: 0, ty: 0 },
            viewEventHandler: {
                commitChanges: () => {
                    this.raise('commitChanges', view.pixels, offset);
                },
                viewDragged: (dx, dy) => this.onViewDragged(newView, dx, dy) ,
            },
            decorationEventHandler: e => {
                if (newView.outOfBounds) {
                    this.bringViewIntoBounds(newView);
                }
            },
        }
        view.site(Site(this));
        this.element.appendChild(newView.decoration);
        newView.decoration.addEventListener('click', newView.decorationEventHandler);

        this.views.push(newView);
        view.setStyle({position: 'absolute', });
        this.positionView(newView);
        this.renderView(newView);

        view.on(newView.viewEventHandler);
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

    private bringViewIntoBounds(view: ArrangerView) {
        var viewBounds = this.getViewBounds(view);
        var relativeTo = this.element.getBoundingClientRect();
        var bounds = { // Relative to top-left corner of arranger
            left: viewBounds.left - relativeTo.left,
            top: viewBounds.top - relativeTo.top,
            right: viewBounds.right - relativeTo.left,
            bottom: viewBounds.bottom - relativeTo.top,
        };
        var viewWidth = this.element.offsetWidth;
        var viewHeight = this.element.offsetHeight;
        var tileWidth = this.codec.tileWidth * this.currentScale;
        var tileHeight = this.codec.tileHeight * this.currentScale;

        if (bounds.left < 0) {
            var minX = -Math.floor(this.viewOrigin.x / tileWidth);
            view.location.tx = minX;
        }
        if (bounds.top < 0) {
            var minY = -Math.floor(this.viewOrigin.y / tileHeight);
            view.location.ty = minY;
        }
        if (bounds.right > viewWidth) {
            var viewRight = viewWidth - this.viewOrigin.x;
            var maxX = Math.floor(viewRight / tileWidth) - 1;
            view.location.tx = maxX;
        }
        if (bounds.bottom > viewHeight) {
            var viewBottom = viewHeight - this.viewOrigin.y;
            var maxY = Math.floor(viewBottom / tileHeight) - 1;
            view.location.ty = maxY;
        }


        this.positionView(view);
    }

    getViewBounds(v: ArrangerView) {
        return v.view.element.getBoundingClientRect();
    }
    /**
     * 
     * @param view 
     * @param oobOnly If true, the view will only be positioned if necessary, with repsect to OOB concerns
     */
    private positionView(view: ArrangerView, oobOnly?: boolean) {
        var viewWidth = this.element.offsetWidth;
        var viewHeight = this.element.offsetHeight;

        var vx = view.location.tx * this.codec.tileWidth * this.currentScale +
            this.viewOrigin.x;
        var vy = view.location.ty * this.codec.tileHeight * this.currentScale +
            this.viewOrigin.y;
        var vr = vx + view.view.element.offsetWidth - 1;
        var vb = vy + view.view.element.offsetHeight - 1;
        




        // We will use the 'decoration' element to cue the user if the view is
        // outside the visible bounds or behind the main tile view
        var viewOOB = vx > viewWidth || vr < 0 || vy > viewHeight || vb < 0;
        var viewBehindTileView = vr < this.viewOrigin.x && vb < this.viewOrigin.y;
        var oobChanged = (viewOOB || viewBehindTileView) != view.outOfBounds;
        if (oobOnly) {
            if (!oobChanged && !viewOOB && !viewBehindTileView) return;
        }

        view.outOfBounds = viewOOB || viewBehindTileView;

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

    performLayout() {
        console.log('layout');
        this.views.forEach(view => this.positionView(view, true));
    }
}