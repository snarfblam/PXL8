import { Widget } from './widget';
import { RGBA } from './gfx/palette';
import { $ } from './dollar';

type Swatch = { color: RGBA, element: HTMLElement };
const horizontalSwatchSpacing = 4; // pixels
const swatchHeightStyle = '24px';
const swatchMarginBottomStyle = '4px';

export interface SwatchGridEvents{
    swatchSelected: (index: number, color: Readonly<RGBA>) => void;
}

export class SwatchGrid extends Widget<SwatchGridEvents> {
    private _swatches: Swatch[] = [];
    private _clears: HTMLElement[] = [];

    constructor() {
        super(true);

        this.element.classList.add('swatch-grid');
        this.subscribeToEvent('mousedown');
    }

    loadSwatches(colors: RGBA[], gridWidth: number) {
        this._destroySwatches();

        var widthPercentage = (100 / gridWidth).toFixed(4);
        var marginStyle = horizontalSwatchSpacing.toString() + "px";
        var widthStyle = // e.g. "calc(33.3333% - 8px)
            "calc(" + widthPercentage + "% - " + marginStyle + ")";
        
        var swatchesInRow = 0;
        for (var i = 0; i < colors.length; i++){
            var element = $.create('div');
            element.style.width = widthStyle;
            element.style.marginRight = marginStyle;
            element.style.background = RGBA.toStyle(colors[i]);
            element.style.height = swatchHeightStyle;
            element.style.marginBottom = swatchMarginBottomStyle;
            element.classList.add('swatch');
            element.style.display = 'inline-block';

            this.element.appendChild(element);
            this._swatches.push({ element, color: { ...colors[i] } });

            swatchesInRow++;
            if (swatchesInRow === gridWidth && i < (colors.length - 1)) {
                var clear = $.create('div');
                clear.style.width = '0px';
                clear.style.height = '0px';
                clear.style.margin = '0';
                clear.style.display = 'block';
                this.element.appendChild(clear);
                this._clears.push(clear);

                swatchesInRow = 0;
            }
        }
    }

    onMouseDown(e: MouseEvent) {
        for (var i = 0; i < this._swatches.length; i++){
            if (this._swatches[i].element === e.target) {
                this.raise("swatchSelected", i, this._swatches[i].color);
                return;
            }
        }
    }


    private _destroySwatches() {
        this._swatches.forEach(swatch => this.element.removeChild(swatch.element));
        this._clears.forEach(clear => this.element.removeChild(clear));

        this._swatches = [];
        this._clears = [];
    }
}