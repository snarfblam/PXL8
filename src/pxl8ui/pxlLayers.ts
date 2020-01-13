import { Widget } from '../widgets/widget';
import { ZRelativePosition } from '../widgets/zlayer';

export enum layers {
    'chrome' = "chrome",
    'fixedViews' = "fixedViews",
    'floatingViews' = "floatingViews",
};
 
Widget.defineLayer(layers.chrome, ZRelativePosition.bottom);
Widget.defineLayer(layers.fixedViews, ZRelativePosition.bottom);
Widget.defineLayer(layers.floatingViews, ZRelativePosition.bottom);