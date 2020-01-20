import { Widget } from "../widgets/widget";
import { layers } from "./pxlLayers";

export class Pxl8Splash extends Widget<{}>{
    public constructor() {
        super(false);
        this.setLayer(layers.splash);
    }
}
Widget.setElementType(Pxl8Splash, 'div', 'pxl8-splash');