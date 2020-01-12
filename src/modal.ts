import { Widget } from "./widget";
import { $ } from "./dollar";

var _globalHost: ModalHost | null = null;
function getGlobalHost() {
    if (!_globalHost) {
        _globalHost = new ModalHost();
        _globalHost.site(document.body);
    }

    return _globalHost!;
}

var _modalCss: Element;
function ensureCssReady() {
    if (!_modalCss) {
        _modalCss = document.createElement('style')
        _modalCss.innerHTML =
            ".modal-host:before { content:''; display: inline-block; height: 100%; vertical-align: middle; margin-right: -0.25em } " +
            ".modal { display: inline-block; vertical-align: middle; width: 300px; }";
        document.body.appendChild(_modalCss);
    }
}

export enum ModalCloseReason{
    /** Modal was closed by user hitting escape or clicking outside the modal. */
    userDismiss,
    /** Modal was closed programatically */
    code,
}


export class ModalHost extends Widget {
    private visible = false;
    private currentModal = null as Modal | null;
    private keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);

    constructor() {
        super();

        this.subscribeToEvent('mousedown');
    }

    createElement() {
        var elem = $.create('div');
        elem.style.position = 'fixed';
        elem.style.width = '100%';
        elem.style.height = '100%';
        elem.style.left = '0px';
        elem.style.top = '0px';
        elem.style.background = 'rgba(0, 0, 0, .7)';
        elem.style.display = 'none';
        elem.classList.add('modal-host');
        elem.style.whiteSpace = 'nowrap';
        elem.style.textAlign = 'center';
        // elem.addEventListener('mousedown', e => this.onMouseDown(e));

        return elem;
    }

    setVisible(visible: boolean) {
        this.visible = visible;
        if (visible) {
            this.element.style.display = 'block';
        } else {
            this.element.style.display = 'none';
        }
    }

    protected onMouseDown(e: MouseEvent) {
        if (e.target === this.element) {
            if (this.currentModal && this.currentModal.closeOnClickOutside) {
                this.hideModalBecause(ModalCloseReason.userDismiss);
            }
        }
    }

    private onKeyDown(e: KeyboardEvent) {
        console.log(e.key, e.keyCode);
        if (this.visible && this.currentModal && this.currentModal.closeOnEscape) {
            if (e.key === 'Esc' || e.key === 'Escape' || e.keyCode === 27) {
                this.hideModalBecause(ModalCloseReason.userDismiss);
            }
        }
    }

    /** To be called by modal objects to show themselves. */
    private showModal(modal: Modal | null) {
        if (this.currentModal) {
            this.currentModal.element.style.display = 'none';
            document.removeEventListener('keydown', this.keyDownHandler);
        }   

        this.currentModal = modal;
        if (this.currentModal) {
            this.currentModal.element.style.display = 'inline-block';
            if (!this.visible) this.setVisible(true);
            document.addEventListener('keydown', this.keyDownHandler);
        } else {
            if (this.visible) this.setVisible(false);
        }
    }

    public hideModal() {
        if (this.currentModal) this.currentModal.hideModal();
    }

    private hideModalBecause(reason: ModalCloseReason) {
        if (this.currentModal) {
            this.currentModal['setCloseReason'](reason);
            this.currentModal.hideModal();
        }
    }

    /** To be called by modal objects to hide themselves. */
    private hideCurrentModal() {
        this.showModal(null);
    }

}

/** 
 * Represents a modal UI element.
 * 
 * Note: A Modal should not be explicitly sited.
 */
export class Modal extends Widget {
    readonly host: ModalHost;
    /** If true, the modal will be closed if the mouse clicks outside the modal */
    closeOnClickOutside = true;
    /** If true, the modal will be close if the user presses escape. */
    closeOnEscape = true;
    protected captionElement: HTMLElement | null = null;
    private closingReason: ModalCloseReason = ModalCloseReason.code;  // until the user does something to say otherwise

    constructor(host?: ModalHost) {
        super();

        this.host = host || getGlobalHost();
        this.site(this.host);

        ensureCssReady();
    }

    /** 
     * Creates the modal element. Do not override.
     */
    createElement() {
        var element = $.create('div') as HTMLDivElement;
        element.classList.add('modal');
        // this.createContents(element);
        return element;
    }

    // /**
    //  * Override this method to populate the modal element with children.
    //  * @param modal The modal element
    //  */
    // protected createContents(modal: HTMLDivElement) {
        
    // }

    showModal() {
        this.host['showModal'](this);
        this.closingReason = ModalCloseReason.code; // until the user does something to say otherwise
    }

    hideModal() {
        if (this.isVisible()) {
            this.closingModal(this.closingReason);
            this.host['hideCurrentModal']();
        }
    }

    private setCloseReason(reason: ModalCloseReason) {
        this.closingReason = reason;
    }

    protected closingModal(reason: ModalCloseReason) { }
    

    isVisible() {
        return this.element.style.display !== 'none';
    }
    /**
     * Sets the caption text for the modal, or hides it if a value of null is specified.
     * @param text The text to display, or null to hide the caption.
     */
    setCaption(text: string | null) {
        if (text == null) {
            if (this.captionElement) {
                this.captionElement.style.display = 'none';
            }
        } else {
            if (!this.captionElement) {
                this.captionElement = $.create('h1');
                this.element.prepend(this.captionElement);
            }
            this.captionElement.textContent = text;
            this.captionElement.style.display = 'block';
        }
    }

    getCaption(): string | null {
        if (!this.captionElement || this.captionElement.style.display === 'none') return null;
        return this.captionElement.textContent;
    }

    /** 
     * Sets the preferred width of the modal. Should be specified as a CSS
     * px or % value.
     */
    setPreferredWidth(style: string) {
        this.element.style.width = style;
    }
}