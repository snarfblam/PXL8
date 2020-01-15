import { Widget } from "./widgets/widget";
import { Events } from "./eventManager";

export interface Siteable {
    sitable: HTMLElement;
    isSited: boolean;
    site: (parent: Site) => void;
    unsite: () => void;
}

export interface Site {
    prepend?: boolean;
    site: HTMLElement;
    /** If specified, defines custom element placement logic. */
    placeElement?: (child: HTMLElement) => void;
}
export function Site<TEvents extends Events<TEvents>>(site: HTMLElement | Widget<TEvents>) {
    if (site instanceof Widget) site = site.element;
    return { site };
}

export function siteChild(child: HTMLElement, site: Site): HTMLElement {
    var target = site.site;
    if (site.placeElement) {
        site.placeElement(child);
    } else if (site.prepend && target.firstChild) {
        target.insertBefore(child, target.firstChild);
    } else {
        target.appendChild(child);
    }

    return target;
}

export class SiteElement implements Site {
    constructor(public site: HTMLElement) {

    }
}