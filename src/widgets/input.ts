/** Mouse button values. Corresponds to MouseEvent.button. */
export enum MouseButton {
    left = 0,
    middle = 1,
    right = 2,
    x1 = 3,
    x2 = 4,
}

/** Mouse button values. Corresponds to MouseEvent.buttons. */
export enum MouseButtons {
    none = 0,
    left = 1,
    middle = 2,
    right = 4,
    x1 = 8,
    x2 = 16,
}
export interface WidgetMouseEvent extends MouseEvent {
    button: MouseButton;    
    buttons: MouseButtons;
}
