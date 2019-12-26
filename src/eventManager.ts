export interface EventSubscription<TEvents> {
    subscribe: (handlerObject: TEvents) => void;
    unsubscribe: (handlerObject: TEvents) => boolean;
}
/** 
 * I'm rather proud of this class, and you need to know this. It took me
 * several attempts to get the generic type arguments correctly orchestrated
 * as to allow the inference of event data types for the 'raise' method.
 */
export class EventManager<TEvents extends { [prop in keyof TEvents]: (...x: any[]) => void }> {
    listeners = [] as TEvents[];
    readonly subscriber: EventSubscription<TEvents>;

    constructor() {
        this.subscriber = {
            subscribe: handler => this.listeners.push(handler),
            unsubscribe: handler => {
                var index = this.listeners.indexOf(handler);
                var found = index >= 0;
                if (found) {
                    this.listeners.splice(index, 1);
                }
                return found;
            }
        };
    }

    raise // forgive the syntax
        <
            T extends keyof TEvents,
            TArg extends Parameters<TEvents[T]>
        >
        (eventName: T, ...args: TArg) {
        {
            this.listeners.forEach(l => {
                var handler = l[eventName];
                if (handler) handler(...args);
            });
        }
    }
    
}

interface ConcreteListener {
    num?: (arg: number) => void;
    str?: (arg: string) => void;
}
var myListener = { num: (arg: number) => { }, str: (arg: string) => { } };

var concreteTest = new EventManager<ConcreteListener>();
// concreteTest.raise('str', 9);
concreteTest.raise('str', '9');
concreteTest.raise('num', 9);
// concreteTest.raise('num', '9');


