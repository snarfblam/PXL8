import { Widget } from './widget';
import { $, $$ } from '../dollar';
import { removeFrom } from '../util';
import { EventManager, Events } from '../eventManager';



export enum ToolbarSize { small, large }

export class Toolbar<TEvents extends Events<TEvents> = {}> extends Widget<TEvents> {
    private iconPath = '';
    private buttons = [] as ToolbarButton[];
    private toolbarSize = ToolbarSize.small;

    constructor(hasEvents?: boolean) {
        super(hasEvents);

        this.setSize(ToolbarSize.small);
    }

    protected createElement() {
        var elem = $.create('div');
        elem.classList.add('toolbar');
        return elem;
    }

    setIconPath(path: string) {
        this.iconPath = path;
        this.buttons.forEach(button => button['updateIconUrl']());
    }

    getIconPath() { return this.iconPath; }

    getSize() { return this.toolbarSize; }
    setSize(size: ToolbarSize) {
        if (this.toolbarSize === ToolbarSize.small) {
            this.element.classList.remove('toolbar-small');
        } else {
            this.element.classList.remove('toolbar-large');
        }
     
        this.toolbarSize = size;
     
        if (this.toolbarSize === ToolbarSize.small) {
            this.element.classList.add('toolbar-small');
        } else {
            this.element.classList.add('toolbar-large');
        }
    }
    
    private registerButton(b: ToolbarButton) { this.buttons.push(b); }
    private unregisterButton(b: ToolbarButton) { removeFrom(this.buttons, b); }
}

export interface ToolbarButtonEvents{
    click: () => void;
}

export class ToolbarButton extends Widget<ToolbarButtonEvents> {
    iconElement: HTMLImageElement;
    captionElement: HTMLSpanElement;
    iconName = "";

    // private eventManager = new EventManager<ToolbarButtonEvents>();
    // public events = this.eventManager.subscriber;

    constructor() {
        super(true);

        this.iconElement = $.create('img') as HTMLImageElement;
        this.iconElement.classList.add('toolbar-icon');

        this.captionElement = $.create('span');
        this.captionElement.classList.add('toolbar-caption');

        this.element.appendChild(this.iconElement);
        this.element.appendChild(this.captionElement);

        this.element.addEventListener('click', () => this.raise('click'));
    }

    protected createElement() {
        var elem = $.create('button');
        elem.classList.add('toolbar-button');

        return elem;        
    }

    setText(text: string) {
        this.captionElement.textContent = text;
    }

    setIcon(name: string) {
        this.iconName = name;
        this.updateIconUrl();
    }

    // site(site: Toolbar) {
    //     super.site(site);
    //     this.updateIconUrl();
    //     site['registerButton'](this);
    // }

    protected onSited() {
        var toolbar = this.findParentWidget();
        if (!(toolbar instanceof Toolbar)) throw Error('ToolbarButton must be placed inside a Toolbar.');
        this.updateIconUrl();
        toolbar['registerButton'](this);
    }

    unsite() {
        this.findToolbar(owner => owner['unregisterButton'](this));
        super.unsite();
    }

    private updateIconUrl() {
        if (this.isSited()) {
            this.iconElement.src = this.getIconPath();
        }
    }

    private findToolbar(action?: (toolbar: Toolbar) => void) {
        var toolbar = this.findParentWidget() as Toolbar | null;
        if (toolbar instanceof Toolbar) {
            if (action) action(toolbar);
            return toolbar;
        } else return null;
    }

    getIconPath() {
        var result = this.iconName;

        var iconPath = (this.findParentWidget()! as Toolbar).getIconPath();
        if (iconPath) {
            if ("/" === iconPath.charAt(iconPath.length - 1)) {
                result = iconPath + result;
            } else {
                result = iconPath + "/" + result;
            }
        }

        return result;
    }
}

export class ToolbarLabel extends Widget {
    text = 'label';

    constructor() {
        super();
    }

    createElement() { 
        var elem = $.create('span');
        elem.textContent = this.text;
        elem.style.marginLeft = elem.style.marginRight = '0.7em';
        return elem;
    }
    
    getText() { return this.text; }
    setText(text: string) {
        this.text = text;
        this.element.textContent = text;
    }
}