import { Modal, ModalHost, ModalCloseReason } from '../widgets/modal';
import { SwatchGrid } from './swatchGrid';
import { TileCodec, PaletteCue, SwatchPaletteCue } from '../gfx/tileCodec';
import { ColorPicker } from './colorPicker';
import { RGBA, Palette } from '../gfx/palette';
import { Promise } from 'es6-promise';
import { Pxl8Modal } from './pxl8Modal';
import { Widget } from '../widgets/widget';
import { $ } from '../dollar';
import { createButton } from '../widgets/button';

enum ColorChannel{
    red = 'red',
    green = 'green',
    blue = 'blue',
}

/** Property name used for component value elements */
const colorValue = '__colorValue';
/** Property name used for component value elements */
const colorChannel = '__colorChannel';

const rgbModalMetrics = {
    channelElementWidthPx: 400,
    channelElementHeightPx: 30,
}


/**
 * Creates a hex code (e.g. "#FF0000")
 * @param channel Which color channel to specify
 * @param value A value between 0 and 255
 */
function createColorHexCode(channel: ColorChannel, value: number) {
    var valueAsHex = Math.floor(value).toString(16);
    while (valueAsHex.length < 2) valueAsHex = "0" + valueAsHex;
    switch (channel) {
        case ColorChannel.red:
            return `#${valueAsHex}0000`;
        case ColorChannel.green:
            return `#00${valueAsHex}00`;
        case ColorChannel.blue:
            return `#0000${valueAsHex}`;
    }
    throw Error('Invalid color channel specified: ' + channel);
}

interface ComponentEvents {
    /** Raised when the color is changed via user interaction. */
    valueSelected: () => void;
}
class ComponentSelector extends Widget<ComponentEvents>{
    detents = 0;
    value = 0;
    channel = ColorChannel.red;
    private width = 0;
    private height = 0;

    componentPickers = [] as HTMLElement[]; 

    constructor() {
        super(true);

        this.subscribeToEvent('mousedown');
    }


    protected onMouseDown(e: MouseEvent) {
        var channel = (e.target as any)[colorChannel] as ColorChannel;
        var value = (e.target as any)[colorValue] as number;
        if (channel) {
            console.log('eggs');

            this.value = value;
            this.raise("valueSelected");
        }
    }

    /**
     * Prepares the component for use
     * @param detents The number of possible values per channel
     * @param width The width of the component in pixels
     * @param height The height of the component in pixels
     */
    initialize(detents: number, channel: ColorChannel, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.detents = detents;
        this.channel = channel;

        if (this.detents) {
            this.uninitialize(); 
        }

        this.setStyle({
            width: width + 'px',
            height: height + 'px',
            position: 'absolute',
        });

        for (var i = 0; i < detents; i++){
            var leftBorder = Math.floor(i * width / detents);
            var rightBorder = Math.floor((i + 1) * width / detents);
            var childWidth = rightBorder - leftBorder;

            var child = $.create('div');
            var value = Math.floor(255 * i / detents);
            child.style.width = childWidth + "px";
            child.style.height = height + "px";
            child.style.top = '0px';
            child.style.left = leftBorder + "px";
            child.style.position = 'absolute';
            child.style.background = createColorHexCode(channel, value);
            (child as any)[colorValue] = i;
            (child as any)[colorChannel] = channel;
            this.element.appendChild(child);
            this.componentPickers.push(child);
        }
    }

    setValue(value: number) {
        this.value = value;
    }

    private uninitialize() {
        this.componentPickers.forEach(child => {
            child.remove();
        });
    }

    dispose() {
        this.uninitialize();
    }
}
Widget.setElementType(ComponentSelector, 'div');

export class RgbModal extends Pxl8Modal implements ColorPicker {
    rSelector = new ComponentSelector();
    gSelector = new ComponentSelector();
    bSelector = new ComponentSelector();
    channelContainer = $.create('div');
    colorPreview = $.create('div');
    okButton = createButton('OK');

    selectedColor: RGBA | null = { r: 0, g: 0, b: 0, a: 255 };

    modalPromise = {
        resolve: null as null | (() => void),
        reject: null as null | ((err: Error) => void),
    };

    constructor(host?: ModalHost) {
        super(false, host);

        this.setCaption("Select a color");
        this.setPreferredWidth('500px');

        this.colorPreview.className = 'pxl8-rgb-preview'
        this.element.appendChild(this.colorPreview);

        this.channelContainer.className = 'pxl8-rgb-grid';
        this.channelContainer.style.position = 'relative';
        this.channelContainer.style.marginLeft = 'auto';
        this.channelContainer.style.marginRight = 'auto';
        this.channelContainer.style.height = (rgbModalMetrics.channelElementHeightPx * 3) + 'px';
        this.channelContainer.style.width = rgbModalMetrics.channelElementWidthPx + 'px';
        this.element.appendChild(this.channelContainer);

        this.rSelector.site(this.channelContainer);
        this.gSelector.site(this.channelContainer);
        this.bSelector.site(this.channelContainer);

        var colorChangeHandler = () => this.onValueChanged();
        this.rSelector.on({ valueSelected: colorChangeHandler });
        this.gSelector.on({ valueSelected: colorChangeHandler });
        this.bSelector.on({ valueSelected: colorChangeHandler });

        this.okButton.site(this);
        this.okButton.addClass('pxl8-rgb-ok pxl8-button');
        this.okButton.on({ click: () => this.hideModal() });
    }

    private onValueChanged() {
        var r = Math.floor(255 * this.rSelector.value / this.rSelector.detents);
        var g = Math.floor(255 * this.gSelector.value / this.gSelector.detents);
        var b = Math.floor(255 * this.bSelector.value / this.bSelector.detents);
        this.selectedColor = { r, g, b, a: 255 };

        this.colorPreview.style.background = RGBA.toStyle(this.selectedColor);

    }


    intitialize(rDetents: number, gDetents: number, bDetents: number) {
        var elemHeight = rgbModalMetrics.channelElementHeightPx;
        var elemWidth = rgbModalMetrics.channelElementWidthPx;

        this.rSelector.setStyle({ position: 'absolute', top: '0px', left: '0px' });
        this.gSelector.setStyle({ position: 'absolute', top: elemHeight + 'px', left: '0px' });
        this.bSelector.setStyle({ position: 'absolute', top: (2 * elemHeight) + 'px', left: '0px' });

        this.rSelector.initialize(rDetents, ColorChannel.red, elemWidth, elemHeight);
        this.gSelector.initialize(gDetents, ColorChannel.green, elemWidth, elemHeight);
        this.bSelector.initialize(bDetents, ColorChannel.blue, elemWidth, elemHeight);
    }

    editColor(previousColor: RGBA): Promise<RGBA | null> {
        this.selectedColor = previousColor;
        this.colorPreview.style.background = RGBA.toStyle(previousColor);
        this.rSelector.setValue(Math.floor(previousColor.r / 255 * this.rSelector.detents))
        this.gSelector.setValue(Math.floor(previousColor.g / 255 * this.gSelector.detents))
        this.bSelector.setValue(Math.floor(previousColor.b / 255 * this.bSelector.detents))

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
