import { Site, siteChild } from "./site";
import { $ } from "./dollar";
import { EventManager, nullEventManager, Events } from "./eventManager";

var elementWidgetSymbol = '#element.widget#';

interface ElementEventHandlerOptions {
    bubbled: boolean;
}

interface ElementEventHandlers{
    mousedown?: ElementEventHandlerOptions,
    mousemove?: ElementEventHandlerOptions,
    mouseup?: ElementEventHandlerOptions,
    click?: ElementEventHandlerOptions,
    dblclick?: ElementEventHandlerOptions,
    wheel?: ElementEventHandlerOptions,
    mouseover?: ElementEventHandlerOptions,
    mouseleave?: ElementEventHandlerOptions,
}
const elementEventToWidgetEventMap = {
    mousedown: 'onMouseDown',
    mousemove: 'onMouseMove',
    mouseup: 'onMouseUp',
    click: 'onClick',
    dblclick: 'onDblClick',
    wheel: 'onWheel',
    mouseover: 'onMouseOver',
    mouseleave: 'onMouseLeave',
}

export type ElementEvents = keyof ElementEventHandlers;

export abstract class Widget
    <TEvents extends Events<TEvents> = {}> {
    
    element: HTMLElement;
    /** 
     * Used by the default implementation of CreateElement. To customize your
     * widget's element type, either override CreateElement or assign a 
     * different value to elementType on your class's __prototype__. */
    //@ts-ignore
    readonly elementType: string;
    protected eventManager: EventManager<TEvents> = nullEventManager as any;
    protected raise = this.eventManager.raise;
    private elementEventHandlers: ElementEventHandlers = {};

    constructor(hasevents?: boolean) {
        this.element = this.createElement();
        (this.element as any)[elementWidgetSymbol] = this;

        if (hasevents) {
            this.eventManager = new EventManager<TEvents>();
            this.raise = this.eventManager.raise.bind(this.eventManager as any);
        }
    }

    /** 
     * Override to customize creation of the widget element. 
     * NOTE: this method is called from the constructor. Overriding code
     * should not reference 'this'!
     */
    protected createElement(): HTMLElement{
        return $.create(this.elementType);
    }
    
    /** Places this element into a parent element */
    public site(site: Site | HTMLElement | Widget) {
        if(this.element.parentElement) throw Error("can not site an already sited widget")

        if (site instanceof HTMLElement) site = { site };
        if (site instanceof Widget) site = { site: site.element };

        siteChild(this.element, site);
    }
    
    /** Removes this element from its parent */
    public unsite() {
        if (this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        } else throw Error("can not unsite a widget that is not sited");
    }

    public getParentElement() {
        return this.element.parentElement;
    }

    /** Finds this widget's parent, or more accurately, 
     * finds the widget whose element is the closes parent to this widget's element */
    public findParentWidget() {
        var elem = this.element.parentElement;
        while (elem) {
            var widg = (elem as any)[elementWidgetSymbol] as Widget;
            if (widg) return widg;
            elem = elem.parentElement;
        }

        return null;
    }

    /** Returns whether this element is sited. */
    public isSited() { return !!this.element.parentElement; }

    on(handler: TEvents) {
        this.eventManager.subscriber.subscribe(handler);
    }
    unhandle(handler: TEvents) {
        this.eventManager.subscriber.unsubscribe(handler);
    }

    public dispose() {
        this.doDispose();
    }

    /** 
     * Override to perform cleanup logic. Overriders should call the
     * super doDispose method to ensure base classes can clean up.
     */
    protected doDispose() {
        for (var key in this.elementEventHandlers) {
            var value = this.elementEventHandlers[key as ElementEvents];
            if (value) this.element.removeEventListener(key, Widget.elementEventHandler);
            delete this.elementEventHandlers[key as ElementEvents];
        }
     }

    /**
     * Enabled the specified event for the underlying element.
     * @param type The name of the element's event.
     * @param handleBubbledEvents Specify false to ignore events generated by child elements.
     */
    protected subscribeToEvent(type: ElementEvents, handleBubbledEvents?: boolean) {
        if (handleBubbledEvents === undefined) handleBubbledEvents = true;

        if (this.elementEventHandlers[type]) {
            console.warn("Widget requested multiple subscriptions to " + type + ". Redundant requests ignored.");
        } else {
            this.elementEventHandlers[type] = { bubbled: handleBubbledEvents };
            this.element.addEventListener(type, Widget.elementEventHandler, false);
        }
    }
    protected unsubscribeToEvent(type: ElementEvents) {
        if (this.elementEventHandlers[type]) {
            delete this.elementEventHandlers[type];
            this.element.removeEventListener(type, Widget.elementEventHandler, false);
        } else {
            console.warn("Widget requested multiple unsubscriptions from " + type + ". Redundant requests ignored.");
        }
    }

    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onMouseDown(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onMouseMove(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onMouseUp(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onClick(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onDblClick(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onWheel(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onMouseOver(e: MouseEvent) { }
    /** Override to handle this event. The event must be subscribed to via this.subscriveToEvent(). */
    protected onMouseLeave(e: MouseEvent) { }

    static elementEventHandler(this: HTMLElement, e: Event) {
        var widget = (this as any)[elementWidgetSymbol] as Widget;
        if (widget) {
            // Subscriber may have requested to ignore events bubbled from children
            var options = widget.elementEventHandlers[e.type as ElementEvents];
            if (options && !options.bubbled) {
                if (e.target !== widget.element) return;
            }

            var handlerName = elementEventToWidgetEventMap[e.type as ElementEvents];
            if ((widget as any)[handlerName]) (widget as any)[handlerName](e);
        }
    }
}
Widget.prototype.elementType = 'div';