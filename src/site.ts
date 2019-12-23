export interface Siteable {
    sitable: HTMLElement;
    isSited: boolean;
    site: (parent: Site) => void;
    unsite: () => void;
}

export interface Site {
    prepend?: boolean;
    site: HTMLElement;
    placeElement?: (child: HTMLElement) => void;
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