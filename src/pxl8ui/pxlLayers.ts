import { Widget } from '../widgets/widget';
import { ZRelativePosition } from '../widgets/zlayer';

export enum layers {
    'modalHost' = "modal",
    'chrome' = "chrome",
    'fixedViews' = "fixedViews",
    'floatingViews' = "floatingViews",
    'floatingViewDecorations' = "floatingViewDecorations",
};
 
Widget.defineLayer(layers.modalHost, ZRelativePosition.bottom);
Widget.defineLayer(layers.chrome, ZRelativePosition.bottom);
Widget.defineLayer(layers.fixedViews, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViews, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViewDecorations, ZRelativePosition.bottom);