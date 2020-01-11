import { Modal, ModalHost } from '../modal';
import { SwatchGrid } from '../swatchGrid';
import { TileCodec, PaletteCue, SwatchPaletteCue } from '../gfx/tileCodec';
import { RGBA } from '../gfx/palette';

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
export class SwatchModal extends Modal {
    swatches = new SwatchGrid();

    constructor(host?: ModalHost) {
        super(host);

        this.swatches.site(this.element);
        this.setCaption("Select a color");
        this.setPreferredWidth('500px');
    }

    loadSwatchesFor(codec: TileCodec) {
        var cue = codec.paletteCue || PaletteCue.default;
        if (cue.type === 'swatches') {
            var colors = SwatchPaletteCue.rrggbbToRGBA(cue.rrggbb);
            this.swatches.loadSwatches(colors, cue.gridWidth || 8);
        }
    }
}
