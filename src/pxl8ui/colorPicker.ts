import { RGBA } from '../gfx/palette';
import { Promise } from 'es6-promise';

export interface ColorPicker{
    editColor(previousColor: RGBA): Promise<RGBA | null>;
}