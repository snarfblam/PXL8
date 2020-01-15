import { Widget } from '../widgets/widget';
import { Events } from '../eventManager';
import { layers } from './pxlLayers';
import { Modal, ModalHost } from '../widgets/modal';

export class Pxl8Modal<TEvents extends Events<TEvents> = {}> extends Modal<TEvents>{
    constructor(hasEvents?: boolean, host?: ModalHost) {
        super(hasEvents, host);
    }
}
Widget.setElementType(Pxl8Modal, 'div', 'pxl8-modal');