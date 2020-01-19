import { Widget } from '../widgets/widget';
import { ZRelativePosition } from '../widgets/zlayer';

export enum layers {
    /** Modal overlay that hosts modal dialogs */
    'modalHost' = "modal",
    /** Toolbar, status bar, etc */
    'chrome' = "chrome",
    /** Primary editing UI */
    'fixedViews' = "fixedViews",
    /** Content that appears over floating arranger views */
    'floatingViewOverlay' = "floatingViewOverlay",
    /** Floating arranger views */
    'floatingViews' = "floatingViews",
    /** Decorative elements that appear beneath floating arranger views */
    'floatingViewDecorations' = "floatingViewDecorations",
};
 
Widget.defineLayer(layers.modalHost, ZRelativePosition.bottom);
Widget.defineLayer(layers.chrome, ZRelativePosition.bottom);
Widget.defineLayer(layers.fixedViews, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViewOverlay, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViews, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViewDecorations, ZRelativePosition.bottom);