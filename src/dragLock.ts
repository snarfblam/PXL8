import { Widget, WidgetLike } from "./widgets/widget";
import { Volatile } from "./util";
import { Point } from "./math";
import { EventManager } from "./eventManager";

function getRelativeCoords(e: MouseEvent, elem: HTMLElement): Volatile<Point> {
    var rect = elem.getBoundingClientRect();
    return Volatile.point(e.x - rect.left, e.y - rect.top);
}

export interface DragLockEvents{
    dragStart?: (x: number, y: number) => void;
    dragTo?: (x: number, y: number) => void;
    dragComplete?: (x: number, y: number) => void;
}

/** 
 * Provides mouse-capture logic for a mousedown->mousemove->mouseup sequence. 
 * This class provides no functionality with regards to drag-and-drop operations.
 */
export class DragLock {
    private eventManager = new EventManager<DragLockEvents>();
    private dragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragCurrentX = 0;
    private dragCurrentY = 0;
    private docMouseMove: (e: MouseEvent) => void;
    private docMouseUp: (e: MouseEvent) => void;

    element: HTMLElement;
    events = this.eventManager.subscriber;

    constructor(target: HTMLElement | WidgetLike) {
        this.element = (target instanceof Widget) ?
            target.element : target;
        
        this.element.addEventListener('mousedown', e => this.onMouseDown(e));
        this.docMouseMove = e => this.onMouseMove(e);
        this.docMouseUp = e => this.onMouseUp(e);

        this.element.draggable = false;
    }

    public getRelativePosition() {
        return Volatile.point(
            this.dragCurrentX - this.dragStartX,
            this.dragCurrentY - this.dragStartY
        );
    }

    private onMouseDown(e: MouseEvent) { 
        e.preventDefault();
        var { x, y } = getRelativeCoords(e, this.element);
        this.beginDragging(x, y);
    }
    private onMouseMove(e: MouseEvent) {
        var { x, y } = getRelativeCoords(e, this.element);
        this.updateDragging(x, y);
     }
    private onMouseUp(e: MouseEvent) { 
        var { x, y } = getRelativeCoords(e, this.element);
        this.finishDragging(x, y);        
    }

    private beginDragging(x: number, y: number) {
        if (this.dragging) return;

        this.dragStartX = this.dragCurrentX = x;
        this.dragStartY = this.dragCurrentY = y;
        document.addEventListener('mousemove', this.docMouseMove);
        document.addEventListener('mouseup', this.docMouseUp);

        this.dragging = true;
        this.eventManager.raise('dragStart', x, y);
    }

    private updateDragging(x: number, y: number) {
        this.dragCurrentX = x;
        this.dragCurrentY = y;
        this.eventManager.raise('dragTo', x, y);
    }
    private finishDragging(x: number, y: number) {
        document.removeEventListener('mousemove', this.docMouseMove);
        document.removeEventListener('mouseup', this.docMouseUp);

        this.dragging = false;
        this.eventManager.raise('dragComplete', x, y);
    }
}