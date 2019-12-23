import { Orientation, eventToClientCoords } from './util';
import { $, $$ } from './dollar';
import { Site, siteChild } from './site';
import { EventManager } from './eventManager';

export interface ScrollbarMetrics {
    /** Orientation of the scrollbar */
    orientation: Orientation,
    /** The thickness of the scrollbar. This is width for a vertical bar or height for a horizontal bar. */
    width: number,
}

export interface ScrollbarEvents {
    pageUp?: () => void;
    pageDown?: () => void;
    tickUp?: () => void;
    tickDown?: () => void;
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
export class Scrollbar{
    readonly metrics: ScrollbarMetrics = { orientation: Orientation.vertical, width: 16 }; // public readonly private writable
    element = $.create('div');
    private readonly eventManager = new EventManager<ScrollbarEvents>();
    public readonly events = this.eventManager.subscriber;
    private value = 0;

    private ui = {
        up: $.create('button'),
        scroll: $.create('div'),
        down: $.create('button'),
    }
    constructor() {
        this.createElements();
        this.applyMetrics();

        this.element.onmousedown = e => this.onMouseDown(e);
        this.ui.up.onclick = e => this.eventManager.raise('tickUp', undefined);
        this.ui.down.onclick = e => this.eventManager.raise('tickDown', undefined);
    }

    site(site: Site) {
        siteChild(this.element, site);
    }

    setMetrics(metrics: ScrollbarMetrics) {
        (this as any).metrics = { ...metrics };
    }

    setValue(value: number) {
        this.value = value;
        if (this.metrics.orientation === Orientation.vertical) {
            var range = this.element.offsetHeight - this.ui.up.offsetHeight - this.ui.down.offsetHeight - this.ui.scroll.offsetHeight;
            var position = Math.floor(range * value);
            this.ui.scroll.style.top = (position + this.ui.up.offsetHeight).toString() + 'px';
        } else throw Error('not implemented');
    }

    createElements() {
        this.element.appendChild(this.ui.up);
        this.element.appendChild(this.ui.scroll);
        this.element.appendChild(this.ui.down);

        this.element.style.position = 'relative';
        this.ui.up.classList.add('scroller-up');
        this.ui.down.classList.add('scroller-down');
        this.ui.scroll.classList.add('scroller-scroll');
        this.ui.up.classList.add('scroller');
        this.ui.down.classList.add('scroller');
        this.ui.scroll.classList.add('scroller');
        this.element.classList.add('scroller');
    }

    applyMetrics() {
        if (this.metrics.orientation !== Orientation.vertical) throw Error('Unsupported scrollbar orientation');

        this.element.style.width = this.metrics.width.toString() + "px";
        setBounds(this.ui.up, 0, 0, this.metrics.width, this.metrics.width);
        setBounds(this.ui.down, 0, -0, this.metrics.width, this.metrics.width);
        setBounds(this.ui.scroll, 0, this.metrics.width, this.metrics.width, this.metrics.width);
    }

    setSize(size: number) {
        if (this.metrics.orientation === 'vertical') {
            this.element.style.height = size + 'px';
        } else if (this.metrics.orientation === 'horizontal') {
            this.element.style.width = size + 'px';
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (e.target === this.element) {
            var { x, y } = eventToClientCoords(this.element, e);
        
            if (y < this.ui.scroll.offsetTop) {
                this.eventManager.raise('pageUp', undefined);
            } else {
                this.eventManager.raise('pageDown', undefined);
            }
        }    
    }
}