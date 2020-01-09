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


export class ModalHost extends Widget {
    private visible = false;
    private currentModal = null as Modal | null;
    private keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);

    constructor() {
        super();
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
        elem.addEventListener('mousedown', e => this.onMouseDown(e));

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

    private onMouseDown(e: MouseEvent) {
        if (e.target === this.element) {
            if (this.currentModal && this.currentModal.closeOnClickOutside) {
                this.hideModal();
            }
        }
    }

    private onKeyDown(e: KeyboardEvent) {
        console.log(e.key, e.keyCode);
        if (this.visible && this.currentModal && this.currentModal.closeOnEscape) {
            if (e.key === 'Esc' || e.key === 'Escape' || e.keyCode === 27) {
                this.hideModal();
            }
        }
    }

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
        this.createContents(element);
        return element;
    }

    /**
     * Override this method to populate the modal element with children.
     * @param modal The modal element
     */
    protected createContents(modal: HTMLDivElement) {
        
    }

    showModal() {
        this.host['showModal'](this);
    }

    hideModal() {
        this.host['hideModal']();
    }
}

export class DemoModal extends Modal {
    createContents(e: HTMLDivElement) {
        super.createContents(e);
        var p = $.create('p');
        p.textContent = 'Modal';
        e.appendChild(p);
    }
}