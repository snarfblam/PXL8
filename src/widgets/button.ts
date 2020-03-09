import { Widget } from "./widget";

export interface ButtonEvents {
    click: () => void;
}

export class Button extends Widget<ButtonEvents> {
    constructor() {
        super(true);
        this.subscribeToEvent('mousedown');
    }

    setText(text: string) {
        this.element.textContent = text;
    }
    getText() {
        return this.element.textContent;
    }
    protected onMouseDown(e: MouseEvent) {
        this.raise('click');
    }
}

export function createButton(text: string) {
    var result = new Button();
    result.setText(text);
    return result;
}
Widget.setElementType(Button, 'button');
