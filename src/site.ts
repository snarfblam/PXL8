export interface Siteable {
    sitable: HTMLElement;
    isSited: boolean;
    site: (parent: Site) => void;
    unsite: () => void;
}

export interface Site {
    site: HTMLElement;
}

export class SiteElement implements Site {
    constructor(public site: HTMLElement) {

    }
}