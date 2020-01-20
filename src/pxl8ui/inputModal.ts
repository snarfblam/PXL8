import { Pxl8Modal } from './pxl8Modal';
import { Widget } from '../widgets/widget';
import { $ } from '../dollar';

export class InputModal extends Pxl8Modal {
    constructor() {
        super();

        this.setCaption('Mouse Input')
        this.createContent();
        this.setPreferredWidth('500px');
    }

    private createContent() {
        this.addHeader('Tile Grid');
        this.addInputLine(["ML"], "Select tile to edit");
        this.addInputLine(["MR"], "Add tile to arranger");
        this.addHeader('Main Editor');
        this.addInputLine(["ML", "||and", "MR"], "Paint");
        this.addHeader('Arranger Tiles');
        this.addInputLine(["ML", "||and", "MR"], "Paint");
        this.addInputLine(["MM", "||or", "Ctrl", "ML"], "Drag");
        this.addInputLine(["Shift", "MM"], "Close tile");
        this.addInputLine(["Ctrl", "Shift", "ML"], "Close tile");
    }

    private addInputLine(keys: string | string[], desc: string) {
        new InputDisplay(keys, desc).site(this);
    }

    private addHeader(name: string) {
        (new InputGroupHeader(name)).site(this);
    }
}
Widget.setElementType(InputModal, 'div', '+ pxl8-info-modal');

class InputGroupHeader extends Widget<{}>{
    constructor(text: string) {
        super(false);
        this.element.textContent = text;
    }
}
Widget.setElementType(InputGroupHeader, 'h3', 'pxl8-input-group-header');

class InputDisplay extends Widget<{}> {
    inputGroup = new InputButtonGroup();

    /**
     * @param input An input string (key name, or ML/MM/MR for mouse), or an array
     * of key names.
     * @param description 
     */
    constructor(input: string | string[], description: string) {
        super(false);
        if (typeof input === 'string') input = [input];

        this.inputGroup.site(this);

        var remainingItems = input.length;
        input.forEach(item => {
            var textNode = (item.indexOf("||") === 0);
            
            if (textNode) {
                var text = " " + item.substring(2) + " ";
                this.inputGroup.element.appendChild(document.createTextNode(text));
            } else {
                if (item === 'ML') {
                    this.appendMouseItem('L', '', '');
                } else if (item === 'MM') {
                    this.appendMouseItem('', 'M', '');
                } else if (item === 'MR') {
                    this.appendMouseItem('', '', 'R');
                } else {
                    (new InputKey(item)).site(this.inputGroup);
                }
            }
        });

        (new InputDescription(description)).site(this);
    }

    private appendMouseItem(l: string, m: string, r: string) {
        var lButton = (new MouseButtonLeft(l));
        if (l) lButton.setStyle({ background: '#e4e4e4' });
        lButton.site(this.inputGroup);

        var mButton = (new MouseButtonMiddle(m));
        if (m) mButton.setStyle({ background: '#e4e4e4' });
        mButton.site(this.inputGroup);

        var rButton = (new MouseButtonRight(r));
        if (r) rButton.setStyle({ background: '#e4e4e4' });
        rButton.site(this.inputGroup);
    }
}
Widget.setElementType(InputDisplay, 'div', 'pxl8-input-row');

class InputDescription extends Widget<{}> {
    constructor(text: string) {
        super(false);
        this.element.textContent = text;
    }
}
Widget.setElementType(InputDescription, 'span', 'pxl8-input-description');

class InputButtonGroup extends Widget<{}> {
    constructor() {
        super(false);
    }
}
Widget.setElementType(InputButtonGroup, 'span', 'pxl8-input-button-group');

class InputKey extends Widget<{}>{
    constructor(text: string) {
        super(false);
        this.element.textContent = text || '\xa0';
    }
}
Widget.setElementType(InputKey, 'div', 'pxl8-input-display pxl8-keyboard-key');


class MouseButtonLeft extends Widget<{}>{
    constructor(text: string) {
        super(false);
        this.element.textContent = text || '\xa0';
    }
}
Widget.setElementType(MouseButtonLeft, 'div', 'pxl8-input-display pxl8-mouse-button-left');

class MouseButtonRight extends Widget<{}>{
    constructor(text: string) {
        super(false);
        this.element.textContent = text || '\xa0';
    }
}
Widget.setElementType(MouseButtonRight, 'div', 'pxl8-input-display pxl8-mouse-button-right');

class MouseButtonMiddle extends Widget<{}>{
    constructor(text: string) {
        super(false);
        this.element.textContent = text || '\xa0';
    }
}
Widget.setElementType(MouseButtonMiddle, 'div', 'pxl8-input-display pxl8-mouse-button-middle');