import { EventSubscription, EventManager } from "./eventManager";
import { Palette, debugPalette } from "./gfx/palette";

export interface DocumentEvents {
    paletteModified?: () => void,
    primaryColorSelected?: ()=> void,
    secondaryColorSelected?: ()=> void,
}

export interface DocumentEditor {
    readonly events: EventSubscription<DocumentEvents>;
    getPrimaryColor(): number;
    getSecondaryColor(): number;
    getPalette(): Palette;
}

export const nullDocument: DocumentEditor = {
    events: new EventManager<DocumentEvents>().subscriber,
    getPrimaryColor: () => 0,
    getSecondaryColor: () => 1,
    getPalette: () => debugPalette,
}