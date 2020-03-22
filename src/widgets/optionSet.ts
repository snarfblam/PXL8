import { Widget, $, $$, findContainingWidget } from './widget';
import { classes } from './classes';

export interface OptionSetEvents {
    /** Raised when the selected value changes. */
    valueChanged?: (value: any) => void;
    /** Raised when the selected value changes through user input. */
    valueSelected?: (value: any) => void;
}
export enum OptionSetView {
    list = 'list',
    icons = 'icons',
}

export class OptionSet extends Widget<OptionSetEvents> {
    private veiw = OptionSetView.icons;
    private items: OptionItem[] = [];
    private selection: OptionItem | null = null;

    constructor() {
        super(true);
        this.subscribeToEvent('click', true);
    }

    addItem(value: string, text: string, imageUrl?: string): OptionItem;
    addItem(item: OptionItem): OptionItem;
    addItem(value: string | OptionItem, text?: string, imageUrl?: string) {
        var newItem: OptionItem;
        if (typeof value === 'string') {
            newItem = new OptionItem(value);
            newItem.setText(text!);
            if (imageUrl) newItem.setImage(imageUrl);
        } else {
            newItem = value;
        }

        this.items.push(newItem);
        newItem.site(this);
        return newItem;
    }

    getValue() {
        return this.selection ? this.selection.getValue() : null;
    }
    /** Sets the value of this option set. Returns false if the specified value is not valid.
     *  @param value A value that corresponds to one the child items
     *  @returns True, if the value is set, or false if the specified value was not valid.
     */
    setValue(value: string) {
        for (var i = 0; i < this.items.length; i++){
            if (this.items[i].getValue() == value) {
                this.setSelectedItem(this.items[i]);
                return true;                
            }
        }
        return false;
    }
    private setSelectedItem(item: OptionItem | null) {
        if (item === this.selection) return;

        if (this.selection) {
            this.selection.removeClass(classes.optionSet.optionSetSelectedItem);
        }
        this.selection = item;
        if (item) {
            item.addClass(classes.optionSet.optionSetSelectedItem);
        }

        this.raise('valueChanged', item ? item.getValue() : null);
    }

    getItems() {
        return [...this.items];
    }
    getItemCount() { return this.items.length; }
    getItem(index: number) { return this.items[index]; }
    removeItem(indexOrItem: number | OptionItem) {
        var index = indexOrItem as number;
        if (typeof indexOrItem !== 'number') {
            index = this.items.indexOf(indexOrItem);
        }

        if (index >= 0 && index < this.items.length) {
            this.items[index].unsite();
            this.items.splice(index, 1);
        }
    }

    onClick(e: MouseEvent) {
        var target = findContainingWidget(e.target as HTMLElement);
        if (target instanceof OptionItem) {
            this.setSelectedItem(target);
            this.raise('valueSelected', target ? target.getValue() : null);
        }
    }
}
Widget.setElementType(OptionSet, 'div', classes.optionSet.optionSet);

export class OptionItem extends Widget<{}> {
    img: HTMLImageElement | null = null;
    txt: HTMLSpanElement;
    private text: string | null = null;
    private value: string | null = null;

    constructor(value?: string) {
        super(false);

        this.value = (value == null) ? null : value;
        this.txt = $.create('span');
    }

    setValue(value: string) { this.value = value; }
    getValue() { return this.value; }
    setText(text: string) {
        this.txt.textContent = this.text = text;
        this.element.appendChild(this.txt);
    }
    setImage(url: string) {
        // Todo: CSS-based image selection should be supported as well
        if (!this.img) {
            this.img = $.create('image') as HTMLImageElement;
            this.element.insertBefore(this.img, this.txt);
        }

        this.img.src = url;
    }
}
Widget.setElementType(OptionItem, 'button', classes.optionSet.optionSetItem);
