import { Orientation, eventToClientCoords } from './util';
import { $, $$ } from './dollar';
import { Site, siteChild } from './site';
import { EventManager } from './eventManager';
import { Widget } from './widget';
import { DragLock } from './dragLock';

export interface ScrollbarMetrics {
    /** Orientation of the scrollbar */
    orientation: Orientation,
    /** The thickness of the scrollbar. This is width for a vertical bar or height for a horizontal bar. */
    width: number,
}

export interface ScrollbarValueEvent {
    /** Can be changed to restrict which values can be selected. 
     *  Initialized with the value selected by the user. */
    value: number | null;
}

export interface ScrollbarEvents {
    // pageUp?: () => void;
    // pageDown?: () => void;
    // tickUp?: () => void;
    // tickDown?: () => void;
    previewChange?: (e: ScrollbarValueEvent) => void;
    valueChanged?: (value: number) => void;
}

function setBounds(element: HTMLElement, x: number, y: number, w: number, h: number){
    element.style.position = 'absolute';
    if (1 / x < 0) {
        element.style.right = Math.abs(x) + "px";
    } else {
        element.style.left = x + "px";
    }
    if (1 / y < 0) {
        element.style.bottom = Math.abs(y) + "px";
    } else {
        element.style.top = y + "px";
    }
    element.style.width = w + "px";
    element.style.height = h + "px";
}


export class ScrollWidget extends Widget<ScrollbarEvents> {
    readonly metrics: ScrollbarMetrics = { orientation: Orientation.vertical, width: 16 }; // public readonly private writable
    // private readonly eventManager = new EventManager<ScrollbarEvents>();
    private valueEventArg = { value: 0 } as ScrollbarValueEvent;
    public readonly events = this.eventManager.subscriber;

    /** Current value */
    private value = 0;
    /** The maximum (exclusive) value */
    private range = 10;
    /** The amount by which the value changes when clicking arrow buttons */
    private lineSize = 1;
    /** The amount by which the value changes when clicking in the track */
    private pageSize = 2;
    /** The range of movement available to the thumb */
    private rangePx = 100;

    private scrollDrag: DragLock;

    private ui = {
        up: $.create('button'),
        thumb: $.create('div'),
        down: $.create('button'),
    }
    constructor() {
        super(true);

        this.createChildElements();
        this.applyMetrics();

        // this.element.onmousedown = e => this.onMouseDown(e);
        this.subscribeToEvent('mousedown');
        // this.ui.up.onclick = e => this.eventManager.raise('tickUp');
        // this.ui.down.onclick = e => this.eventManager.raise('tickDown');
        this.ui.up.onclick = e => {
            e.preventDefault();
            this.proposeScroll(-this.lineSize);
        }
        this.ui.down.onclick = e => {
            e.preventDefault();
            this.proposeScroll(this.lineSize);
        }

        this.scrollDrag = new DragLock(this.ui.thumb);
        this.handleThumbEvents();
        this.positionThumb();
    }

    // site(site: Site) {
    //     siteChild(this.element, site);
    // }
    setRange(range: number, lineSize: number, pageSize: number) {
        this.range = range;
        this.lineSize = lineSize;
        this.pageSize = pageSize;
        this.setValue(this.value);
    }

    setMetrics(metrics: ScrollbarMetrics) {
        (this as any).metrics = { ...metrics };
    }

    getValue() { return this.value; }

    private proposeValue(proposedValue: number) {
        this.valueEventArg.value = proposedValue;
        this.eventManager.raise('previewChange', this.valueEventArg);
        var newValue = this.valueEventArg.value;

        if (newValue != null && newValue !== this.value) {
            this.setValue(newValue);
        }
    }

    private proposeScroll(proposedChange: number) {
        this.proposeValue(this.value + proposedChange);
    }

    setValue(value: number) {
        if (value !== this.value) {
            this.value = value;
            this.positionThumb();
            this.eventManager.raise('valueChanged', this.value);
        }
        // if (this.metrics.orientation === Orientation.vertical) {
        //     var range = this.element.offsetHeight - this.ui.up.offsetHeight - this.ui.down.offsetHeight - this.ui.scroll.offsetHeight;
        //     var position = Math.floor(range * value);
        //     this.ui.scroll.style.top = (position + this.ui.up.offsetHeight).toString() + 'px';
        // } else throw Error('not implemented');
    }

    private positionThumb() {
        var position = Math.floor(this.value / this.range * this.rangePx);
        if (this.metrics.orientation === Orientation.vertical) {
            this.ui.thumb.style.top = (position + this.ui.up.offsetHeight).toString() + 'px';
        } else {
            this.ui.thumb.style.left = (position + this.ui.up.offsetWidth).toString() + 'px';
        }
    }

    createElement() {
        var result = $.create('div');
        return result;
    }

    createChildElements() {
        this.element.appendChild(this.ui.up);
        this.element.appendChild(this.ui.thumb);
        this.element.appendChild(this.ui.down);

        this.element.style.position = 'relative';
        this.ui.up.classList.add('scroller-up');
        this.ui.down.classList.add('scroller-down');
        this.ui.thumb.classList.add('scroller-thumb');
        this.ui.up.classList.add('scroller');
        this.ui.down.classList.add('scroller');
        this.ui.thumb.classList.add('scroller');
        this.element.classList.add('scroller');
    }

    private handleThumbEvents() {
        this.scrollDrag.events.subscribe({
            dragStart: (x, y) => {

            },
            dragTo: (x, y) => {
                var { x, y } = this.scrollDrag.getRelativePosition();
                var delta = this.metrics.orientation === Orientation.horizontal ? x : y;
                var thumb = this.getThumbPos();
                var proposedPos = thumb.location + delta;
                var proposedValue = proposedPos / thumb.range * this.range;
                proposedValue = Math.floor(proposedValue);
                if (proposedValue < 0) proposedValue = 0;
                if (proposedValue >= this.range) proposedValue = this.range - 1;

                this.proposeValue(proposedValue);
            },
            dragComplete: (x, y) => {

            },
        });
    }

    applyMetrics() {
        if (this.metrics.orientation !== Orientation.vertical) throw Error('Unsupported scrollbar orientation');

        this.element.style.width = this.metrics.width.toString() + "px";
        setBounds(this.ui.up, 0, 0, this.metrics.width, this.metrics.width);
        setBounds(this.ui.down, 0, -0, this.metrics.width, this.metrics.width);
        setBounds(this.ui.thumb, 0, this.metrics.width, this.metrics.width, this.metrics.width);
    }

    /** Returns the position and range of the draggable scroll thumb, in pixels. */
    private getThumbPos() {
        var horiz = this.metrics.orientation === Orientation.horizontal;
        var location = horiz ?
            (this.ui.thumb.offsetLeft - this.element.offsetLeft) :
            (this.ui.thumb.offsetTop - this.element.offsetTop);
        location -= this.metrics.width; // Position does not include up button
        return { location, range: this.rangePx };

    }
    
    setSize(size: number) {
        if (this.metrics.orientation === 'vertical') {
            this.element.style.height = size + 'px';
            var trackSize = this.element.offsetHeight - this.metrics.width * 2;
            var thumbRatio = this.pageSize / this.range;
            var thumbSize = Math.floor(trackSize * thumbRatio);
            this.ui.thumb.style.height = thumbSize + "px";
            this.rangePx = this.element.offsetHeight - this.metrics.width * 2 - thumbSize; // height minus up/down/thumb
        } else if (this.metrics.orientation === 'horizontal') {
            this.element.style.width = size + 'px';
            this.rangePx = this.element.offsetWidth - this.metrics.width * 3; // height minus up/down/thumb
        }

        this.positionThumb();
    }

    protected onMouseDown(e: MouseEvent) {
        if (e.target === this.element) {
            var { x, y } = eventToClientCoords(this.element, e);
        
            if (y < this.ui.thumb.offsetTop) {
                // this.eventManager.raise('pageUp');
                this.proposeScroll(-this.pageSize);
            } else {
                // this.eventManager.raise('pageDown');
                this.proposeScroll(this.pageSize);
            }
        }    
    }
}