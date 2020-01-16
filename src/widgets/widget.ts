import { Site, siteChild } from "../site";
import { $ } from "../dollar";
import { EventManager, nullEventManager, Events } from "../eventManager";
import { ZLayer, ZRelativePosition } from './zlayer';

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
    <TEvents extends Events<TEvents>> {
    // <TEvents extends Events<TEvents> = {}> {
    
    element: HTMLElement;
    /** 
     * Used by the default implementation of CreateElement. To customize your
     * widget's element type, either override CreateElement or call
     * Widget.setElementType to change your class's default element type. */
    //@ts-ignore
    readonly elementType: string;
    /** 
     * Used by the default implementation of CreateElement. To customize your
     * widget's css class list, either override CreateElement or call
     * Widget.setElementType to change your class's css class list. */
    //@ts-ignore
    readonly cssClassList: string[];
    private eventManager: EventManager<TEvents> = nullEventManager as any;
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

    protected getEventManager() { return this.eventManager;}
    /** 
     * Override to customize creation of the widget element. 
     * NOTE: this method is called from the constructor. Overriding code
     * should not reference 'this'!
     */
    protected createElement(): HTMLElement{
        var elem = $.create(this.elementType);
        if (this.cssClassList) {
            this.cssClassList.forEach(cls => elem.classList.add(cls));
        }
        return elem;
    }

    setStyle(values: { [name: string]: string }): void;
    setStyle(name: string, value: string): void;
    setStyle(style: string | { [name: string]: string }, value?: string): void {
        // Does TS provide a mechanism to accommodate this sort of overload forwarding?
        // as-is I'm just shoehorning the args through on the basis that currently the methods are known (to me) to have compatible overload sets
        Widget.setElementStyle(this.element, style as string, value!);
    }

    static setElementStyle(element:HTMLElement | WidgetLike, values: { [name: string]: string }): void;
    static setElementStyle(element:HTMLElement | WidgetLike, name: string, value: string): void;
    static setElementStyle(element:HTMLElement | WidgetLike, style: string | { [name: string]: string }, value?: string): void {
        if (element instanceof Widget) element = element.element;

        if (typeof style === 'string') {
            (element.style as any)[style] = value;
        } else {
            for (const key in style) {
                (element.style as any)[key] = style[key];
            }
        }
    }
    /** Places this element into a parent element */
    public site<TEvents extends Events<TEvents>>(site: Site | HTMLElement | Widget<TEvents>) {
        if(this.element.parentElement) throw Error("can not site an already sited widget")

        if (site instanceof HTMLElement) site = { site };
        if (site instanceof Widget) site = { site: site.element };

        siteChild(this.element, site);
        this.onSited();
    }

    protected onSited() { }
    
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
            var widg = (elem as any)[elementWidgetSymbol] as WidgetLike;
            if (widg) return widg;
            elem = elem.parentElement;
        }

        return null;
    }

    /** Returns whether this element is sited. */
    isSited() { return !!this.element.parentElement; }

    /**
     * Specifies the z-layer this widget appears on. The element must be 
     * "layered" (having a CSS position other than 'static').
     * @param zLayer The named layer this widget will appear on.
     * @param makeLayered If true, the element's 'position' style will be set to 'relative' if it is currently 'static'
     */
    setLayer(zLayer: string, makeLayered?: boolean) {
        ZLayer.setLayer(this as any, zLayer, makeLayered);
    }

    static defineLayer(name: string, position: ZRelativePosition) {
        ZLayer.addLayer(name, position);
    }

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

    private static elementEventHandler(this: HTMLElement, e: Event) {
        var widget = (this as any)[elementWidgetSymbol] as WidgetLike;
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

    /**
     * Sets the element type and/or class list to use for a widget.
     * @param widgetClass The Widget class to update.
     * @param elementType The element type to use, e.g. 'div', or undefined to 
     * leave unchanged
     * @param cssClassList A class-list string (space-separated class names). 
     * Start the string with a plus symbol to inherit any base classes, e.g.
     * '+ my-widget drop-shadow' will inherit css classes from the widget's super class.
     */
    static setElementType(widgetClass: Function, elementType?: string, cssClassList?: string) {
        if (elementType) {
            widgetClass.prototype.elementType = elementType;
        }
        if (cssClassList) {
            var currentClassList = (widgetClass.prototype.cssClass || []) as string[];
            var newClassList = cssClassList.split(' ').filter(i => i);
            
            // '+' expands to base class's css class list
            if (newClassList[0] === '+') {
                newClassList.shift();
                newClassList = currentClassList.concat();
            }

            widgetClass.prototype.cssClassList = newClassList;
        }
    }
}
// (Widget.prototype as any).elementType = 'div';
Widget.setElementType(Widget, 'div', 'widget');

/** Enumerates properties of Widget that are dependant upon the generic type parameter. */
type WidgetGenericDependants = 'on' | 'raise' | 'unhandle';
/**
 * A Widget supertype that encompasses all Widget classes, regardless of their 
 * generic event type parameter.
 * @summary Represents any widget
 */
// export type WidgetLike = Pick<Widget<{}>, Exclude<keyof Widget<{}>, WidgetGenericDependants>>;
// var x: Widget<any> = (null as never as Widget<{ x: () => void }>);
export type WidgetLike = Widget<any>;