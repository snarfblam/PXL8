import { Widget, WidgetLike } from './widget';

interface ZLayerEntry {
    zIndex: number;
    zIndexStyle: string;
}

var entries: { [name: string]: ZLayerEntry | undefined } = {};

var underneathLowerBound = -1000;
var underneathUpperBound = -1000;
var lowerBound = 1000;
var upperBound = 1000;

function addLayer(name: string, position: ZRelativePosition) {
    var index: number = 0;
    if (position === ZRelativePosition.bottom) {
        index = lowerBound;
        lowerBound--;
    } else if (position === ZRelativePosition.top) {
        index = upperBound;
        upperBound++;
    } else if (position === ZRelativePosition.underneathBottom) {
        index = underneathLowerBound;
        underneathLowerBound--;
    } else if (position === ZRelativePosition.underneathTop) {
        index = underneathUpperBound;
        underneathUpperBound--;
    }

    if (index === 0) throw Error('Layer indecies exhausted.');
    if (entries.hasOwnProperty(name)) console.warn('Duplicate z-layer definition: ' + name);
    entries[name] = { zIndex: index, zIndexStyle: index.toString() };
}

function setLayer(element: HTMLElement | WidgetLike, layer: string, forceLayered?: boolean) {
    if (element instanceof Widget) element = element.element;
    var layerObj = entries[layer];
    if (layerObj) {
        element.style.zIndex = layerObj.zIndexStyle;
    }
    if (forceLayered) { 
        if (window.getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
    }
}


function getZIndex(layerName: string) {
    var entry = entries[layerName];
    return entry ? entry.zIndex : undefined;
}

export enum ZRelativePosition {
    /** The layer will be added above all previous layers. */
    "top"= 'top',
    /** The layer will be added below all previous layers, except for "underneath" layers. */
    "bottom" = 'bottom',
    /** The layer will be added above all "underneath" layers, and under all normal layers. */
    "underneathTop"= 'underneathTop',
    /** The layer will be added below all other layers.*/
    "underneathBottom" = 'underneathBottom',
}

/**
 * Manages z-indexing for widgets. __NOTE__: Layering is implemented via CSS
 * z-index and operates within DOM stacking contexts. Elements will be layered
 * with respect to eachother only within the context of the nearest 
 * CSS-positioned parent element.
 */
export const ZLayer = {
    /**
     * Adds a layer to the layer stack.
     * @param name The name of the layer.
     * @param position How the layer will be positioned.
     */
    addLayer,
    /**
     * Places the specified element on the specified layer. __NOTE__:
     * layers must be defined prior to applying them to a widget or element.
     * @param element The element to position
     * @param layer The layer to place the element on.
     */
    setLayer,
    /**
     * Gets the z-index of the specified layer. Returns undefined if the specified
     * layer does not exist.
     * @param layerName 
     */
    getZIndex,
}

