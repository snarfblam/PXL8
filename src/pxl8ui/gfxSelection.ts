import { $, $$ } from '../dollar';
import { EventManager } from '../eventManager';
import { DragLock } from '../dragLock';
import { GfxView } from './gfxView';
import { clamp } from '../math';
import { Widget } from '../widgets/widget';

export enum GfxSelectionMode {
    'linear' = 'linear',
    'square' = 'square',
}

export interface GfxSelectionMetrics{
    viewOffset: number;
    bytesPerTile: number;
    tileWidth: number;
    tileHeight: number;
    gridWidth: number;
    gridHeight: number;
    viewPositionX: number,
    viewPositionY: number,
}

/** Describes the range of a user's selection */
export interface SelectionInfo {
    /** Offset of the tile where the selection beings. */
    start: number;
    /** Offset of the tile where the selection ends. The end tile may be at a lesser offset than the begin tile. */
    end: number;
    /** Offset of the first selected tile. */
    firstTile: number;
    /** Offset of the last selected tile (inclusive). The selection extends through the indicated tile. */
    lastTile: number;
    /** The size in bytes of the data in the selected region. */
    byteCount: number;
    /** The number of tiles in the selected region. */
    tileCount: number;
}

export interface GfxSelectionEvents {
    // queryMetrics: (metrics: GfxSelectionMetrics) => void;
    queryOffset: (evt: { offset: number }) => void
}

const hiddenSelectionStyle = {
    background: 'rgba(0, 114, 255, 0.15)',
    outline: '1px solid white',
    outlineOffset: '-1px'
}
const normalSelectionStyle = {
    background: 'rgba(0, 114, 255, 0.75)',
    outline: 'none',
}

/** 
 * Manages the UI and logic of user selection within a GfxView 
 * 
 * DOM: This class requires a GfxView placed in a parent element where the
 * parent has absolute or relative positioning.
 * */
export class GfxSelection {
    private selectionStartOffset = 0;
    private selectionEndOffset = 0;
    /** Set to true to hide the current selection. This occurs when the user
     *  initially mouse-downs, before he actually moves the mouse pointer.
     */
    private selectionHidden = true;
    private mode = GfxSelectionMode.linear;
    private dragLock: DragLock;

    private metrics = {
        viewOffset: 0,
        bytesPerTile: 16,
        tileWidth: 16,
        tileHeight: 16,
        gridWidth: 16,
        gridHeight: 16,
        viewPositionX: 0,
        viewPositionY: 0,
    } as GfxSelectionMetrics;

    private selTop = createSelectionElement();
    private selMid = createSelectionElement();
    private selBottom = createSelectionElement();
    private viewParent: HTMLElement | null = null;

    private eventManager = new EventManager<GfxSelectionEvents>();
    public events = this.eventManager.subscriber;
    
    public constructor(private view: GfxView) {
        this.dragLock = new DragLock(view.element);

        this.dragLock.events.subscribe({
            dragStart: (x,y) => {
                this.queryMetrics();
                this.selectionHidden = true;
                this.beginSelection(this.pointToOffset(x, y), GfxSelectionMode.linear);
            },
            dragTo: (x, y) => {
                this.queryMetrics();
                this.extendSelection(this.pointToOffset(x, y));
            },
        });
    }

    public setSelectionStyle(style: { [name: string]: string }) {
        Widget.setElementStyle(this.selTop, style);
        Widget.setElementStyle(this.selMid, style);
        Widget.setElementStyle(this.selBottom, style);
    }

    public getSelectionRange(): SelectionInfo {
        this.queryMetrics();

        var start = this.selectionStartOffset;
        var end = this.selectionEndOffset;
        var firstTile = Math.min(start, end);
        var lastTile = Math.max(start, end);
        var byteCount = lastTile - firstTile + this.metrics.bytesPerTile;
        var tileCount = Math.floor(byteCount / this.metrics.bytesPerTile);
        
        return { start, end, firstTile, lastTile, byteCount, tileCount };
    }

    private pointToOffset(pxX: number, pxY: number) {
        var tX = Math.floor(pxX / this.metrics.tileWidth);
        tX = clamp(tX, 0, this.metrics.gridWidth - 1);
        var tY = Math.floor(pxY / this.metrics.tileHeight);
        tY = clamp(tY, 0, this.metrics.gridHeight - 1);
        
        return this.metrics.viewOffset +
            this.metrics.bytesPerTile * (tX + tY * this.metrics.gridWidth);
    }

    private beginSelection(offset: number, mode: GfxSelectionMode) {
        this.selectionStartOffset = offset;
        this.selectionEndOffset = offset;
        this.mode = mode;
        this.updateSelectionElements();
    }

    private extendSelection(selectionEndOffset: number) {
        this.selectionEndOffset = selectionEndOffset;
        if (this.selectionEndOffset != this.selectionStartOffset) {
            this.selectionHidden = false;
        }
        this.updateSelectionElements();
    }

    /** 
     * Updates internal metrics cache. This method must be called before 
     * responding to mouse events, updating UI, or performing any other
     * logic that depends on the layout and state of the UI.
     */
    private queryMetrics() {
        // this.eventManager.raise('queryMetrics', this.metrics);
        var offset = { offset: 0 };
        this.eventManager.raise('queryOffset', offset);
        
        this.ensureSited();
        if (this.viewParent) {
            this.metrics = {
                bytesPerTile: this.view.codec!.bytesPerTile,
                gridWidth: this.view.metrics.gridWidth,
                gridHeight: this.view.metrics.gridHeight,
                tileWidth: this.view.metrics.tileWidth * this.view.metrics.pixelWidth,
                tileHeight: this.view.metrics.tileHeight * this.view.metrics.pixelHeight,
                viewOffset: offset.offset,
                viewPositionX: this.view.element.offsetLeft,  //  - this.viewParent!.offsetLeft,
                viewPositionY: this.view.element.offsetTop, // - this.viewParent!.offsetTop,
            }
        }
    }

    private ensureSited() {
        if (!this.viewParent) {
            this.viewParent = this.view.element.parentElement;
            this.viewParent!.appendChild(this.selTop);
            this.viewParent!.appendChild(this.selMid);
            this.viewParent!.appendChild(this.selBottom);
        }
    }

    /** 
     * Performs layout of selection UI. Call when the view is scrolled or its
     * size changes.
     */
    public updateSelectionUi() {
        this.queryMetrics();
        this.updateSelectionElements();
    }

    /** Updates the UI selection elements. Call this.queryMetrics prior. */
    private updateSelectionElements() {
        if (this.mode === GfxSelectionMode.linear) {
            var metrics = this.metrics;

            var selStart = Math.floor(
                (this.selectionStartOffset - metrics.viewOffset)
                / this.metrics.bytesPerTile
            );
            var selEnd = Math.floor(
                (this.selectionEndOffset - metrics.viewOffset)
                / this.metrics.bytesPerTile
            );
            var lesser = Math.min(selStart, selEnd);
            var greater = Math.max(selStart, selEnd);
            var lesserCoords = {
                x: lesser % this.metrics.gridWidth,
                y: Math.floor(lesser / this.metrics.gridWidth),
            };
            var greaterCoords = {
                x: greater % this.metrics.gridWidth,
                y: Math.floor(greater / this.metrics.gridWidth),
            };
            var verticalSpan = 1 + greaterCoords.y - lesserCoords.y;
            if (verticalSpan === 1) {
                this.positionSelectionRect(this.selTop,
                    lesserCoords.x,
                    lesserCoords.y,
                    greaterCoords.x - lesserCoords.x + 1,
                    1
                );
                this.hideSelectionRect(this.selMid);
                this.hideSelectionRect(this.selBottom);
            } else {
                this.positionSelectionRect(this.selTop,
                    lesserCoords.x,
                    lesserCoords.y,
                    metrics.gridWidth - lesserCoords.x,
                    1
                );
                this.positionSelectionRect(this.selBottom,
                    0,
                    greaterCoords.y,
                    greaterCoords.x + 1,
                    1
                );
                if (verticalSpan === 2) {
                    this.hideSelectionRect(this.selMid);
                } else {
                    this.positionSelectionRect(this.selMid,
                        0,
                        lesserCoords.y + 1,
                        metrics.gridWidth,
                        greaterCoords.y - lesserCoords.y - 1
                    );
                }
            }
        }
    }

    private positionSelectionRect(elem: HTMLElement, tileX: number, tileY: number, tileW: number, tileH: number) {
        elem.style.display = 'block';
        var left = this.metrics.viewPositionX + tileX * this.metrics.tileWidth;
        var top = this.metrics.viewPositionY + tileY * this.metrics.tileHeight;
        elem.style.left = left.toString() + 'px';
        elem.style.top = top.toString() + 'px';
        elem.style.width = (tileW * this.metrics.tileWidth).toString() + 'px';
        elem.style.height = (tileH * this.metrics.tileHeight).toString() + 'px';
        var style = this.selectionHidden ? hiddenSelectionStyle : normalSelectionStyle;
        for (var key in style) {
            (elem.style as any)[key] = (style as any)[key];
        }
    }
    private hideSelectionRect(elem: HTMLElement) {
        elem.style.display = 'none';
    }
}


function createSelectionElement() {
    var elem = $.create('div');
    elem.style.position = 'absolute';
    elem.style.display = 'none';
    elem.style.pointerEvents = 'none'
        elem.style.background = 'rgba(0, 114, 255, 0.75)';
        return elem;
}