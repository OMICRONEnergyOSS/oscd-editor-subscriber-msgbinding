import { SubscribeStatus } from './foundation/subscription.js';

export type ServiceType = 'goose' | 'smv';

export interface ControlSelectDetail {
  controlBlock: Element | undefined;
  dataset: Element | undefined;
}
export type ControlSelectEvent = CustomEvent<ControlSelectDetail>;
export function newControlSelectEvent(
  controlBlock: Element | undefined,
  dataset: Element | undefined,
  eventInitDict?: CustomEventInit<ControlSelectDetail>,
): ControlSelectEvent {
  return new CustomEvent<ControlSelectDetail>('control-select', {
    bubbles: true,
    composed: true,
    ...eventInitDict,
    detail: { controlBlock, dataset, ...eventInitDict?.detail },
  });
}

export interface ControlSubscriptionDetail {
  element: Element;
  subscribeStatus: SubscribeStatus;
}
export type ControlSubscriptionEvent = CustomEvent<ControlSubscriptionDetail>;
export function newControlSubscriptionEvent(
  element: Element,
  subscribeStatus: SubscribeStatus,
): ControlSubscriptionEvent {
  return new CustomEvent<ControlSubscriptionDetail>('control-subscription', {
    bubbles: true,
    composed: true,
    detail: { element, subscribeStatus },
  });
}

declare global {
  interface ElementEventMap {
    ['control-select']: ControlSelectEvent;
    ['control-subscription']: ControlSubscriptionEvent;
  }
}
