import { EventSubscription } from "./eventManager";
import { Palette } from "./gfx/palette";

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