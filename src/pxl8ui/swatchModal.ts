import { Modal, ModalHost, ModalCloseReason } from '../modal';
import { SwatchGrid } from '../swatchGrid';
import { TileCodec, PaletteCue, SwatchPaletteCue } from '../gfx/tileCodec';
import { ColorPicker } from './colorPicker';
import { RGBA, Palette } from '../gfx/palette';
import { Promise } from 'es6-promise';

/*
 var swatches = new SwatchGrid();
        swatches.loadSwatches(
            SwatchPaletteCue.rrggbbToRGBA(((nesCodec.paletteCue as SwatchPaletteCue).rrggbb)),
            14);
        var mahModal = new Modal();
        swatches.site(mahModal);
        mahModal.setCaption('Select a Color');
        mahModal.setPreferredWidth('500px');
*/
export class SwatchModal extends Modal implements ColorPicker {
    swatches = new SwatchGrid();
    selectedColor: RGBA | null = null;
    modalPromise = {
        resolve: null as null | (() => void),
        reject: null as null | ((err: Error) => void),
    };

    constructor(host?: ModalHost) {
        super(host);

        this.setCaption("Select a color");
        this.setPreferredWidth('500px');

        this.swatches.site(this.element);
        this.swatches.on({
            swatchSelected: (index, color) => {
                this.selectedColor = color;
                this.hideModal();
            }
        });
    }

    loadSwatchesFor(codec: TileCodec) {
        var cue = codec.paletteCue || PaletteCue.default;
        if (cue.type === 'swatches') {
            var colors = SwatchPaletteCue.rrggbbToRGBA(cue.rrggbb);
            this.swatches.loadSwatches(colors, cue.gridWidth || 8);
        }
    }

    editColor(previousColor: RGBA):Promise<RGBA | null> {
        this.showModal();

        var promise = new Promise<void>((resolve, reject) => {
            this.modalPromise = { resolve, reject };
        });
        return promise.then(() => this.selectedColor);
    }

    closingModal(reason: ModalCloseReason) {
        if (reason === ModalCloseReason.userDismiss) this.selectedColor = null;
        var resolve = this.modalPromise.resolve;
        this.modalPromise.resolve = this.modalPromise.reject = null;
        if (resolve) resolve();
    }

}
