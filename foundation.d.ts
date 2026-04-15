import { SubscribeStatus } from './foundation/subscription.js';
export type ServiceType = 'goose' | 'smv';
export interface ControlSelectDetail {
    controlBlock: Element | undefined;
    dataset: Element | undefined;
}
export type ControlSelectEvent = CustomEvent<ControlSelectDetail>;
export declare function newControlSelectEvent(controlBlock: Element | undefined, dataset: Element | undefined, eventInitDict?: CustomEventInit<ControlSelectDetail>): ControlSelectEvent;
export interface ControlSubscriptionDetail {
    element: Element;
    subscribeStatus: SubscribeStatus;
}
export type ControlSubscriptionEvent = CustomEvent<ControlSubscriptionDetail>;
export declare function newControlSubscriptionEvent(element: Element, subscribeStatus: SubscribeStatus): ControlSubscriptionEvent;
declare global {
    interface ElementEventMap {
        ['control-select']: ControlSelectEvent;
        ['control-subscription']: ControlSubscriptionEvent;
    }
}
