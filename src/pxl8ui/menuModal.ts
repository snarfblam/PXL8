import { Modal, ModalHost, ModalCloseReason } from '../widgets/modal';
import { SwatchGrid } from './swatchGrid';
import { TileCodec, PaletteCue, SwatchPaletteCue } from '../gfx/tileCodec';
import { ColorPicker } from './colorPicker';
import { RGBA, Palette } from '../gfx/palette';
import { Promise } from 'es6-promise';
import { Pxl8Modal } from './pxl8Modal';
import { Toolbar } from '../widgets/toolbar';
import { Widget } from '../widgets/widget';
import {OptionItem, OptionSet } from '../widgets/optionSet';
import { Events } from '../eventManager';

export interface MenuPanes {
    readonly format: TileFormatPane;
}

export class MenuModal extends Pxl8Modal{
    public readonly panes: MenuPanes = {
        format: new TileFormatPane(),
    }

    constructor() {
        super(true);
        this.panes.format.site(this);
    }
}

class MenuToolbar extends Toolbar {

}

class MenuPane<TEvents extends Events<TEvents>> extends Widget<TEvents> {
}

export interface TileFormatPaneEvents {
    formatSelected?: () => void;
}
class TileFormatPane extends MenuPane<TileFormatPaneEvents> {
    formats = new OptionSet();

    constructor() {
        super(true);

        this.element.appendChild(document.createTextNode('Format: '));

        this.formats.addItem('NES', 'NES');
        this.formats.addItem('GB', 'GB');
        // this.formats.addItem('SNES', 'SNES');
        this.formats.site(this);

        this.formats.on({ valueChanged: value => this.raise('formatSelected') });
    }

    getFormat() {
        return this.formats.getValue();
    }
    setFormat(format: 'GB' | 'NES' | 'SNES') {
        if (!this.formats.setValue(format)) {
            console.error('Invalid tile format specified: ' + format);
        }
    }
}

