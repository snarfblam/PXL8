import { Site, siteChild } from "./site";
import { $ } from "./dollar";
import { EventManager, nullEventManager, Events } from "./eventManager";

var elementWidgetSymbol = '#element.widget#';


export abstract class Widget
    <TEvents extends Events<TEvents> = {}> {
    
    element: HTMLElement;
    //@ts-ignore
    elementType: string;
    protected eventManager: EventManager<TEvents> = nullEventManager as any;

    constructor(hasevents?: boolean) {
        this.element = this.createElement();
        (this.element as any)[elementWidgetSymbol] = this;

        if (hasevents) {
            this.eventManager = new EventManager<TEvents>();
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

    public dispose() {
        this.doDispose();
    }

    /** 
     * Override to perform cleanup logic. Overriders should call the
     * super doDispose method to ensure base classes can clean up.
     */
    protected doDispose() { }
}
Widget.prototype.elementType = 'div';