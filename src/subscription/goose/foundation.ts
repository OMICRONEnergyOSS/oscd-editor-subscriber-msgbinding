// src/subscription/goose/foundation.ts
//
// Copied from legacy monorepo and transformed for standalone use.
// Original: legacy/compas-open-scd/packages/plugins/src/editors/subscription/goose/foundation.ts
// Changes:
//   - Import path for SubscribeStatus adjusted to local foundation module
//   - Removed global ElementEventMap declaration (not needed in standalone)

import { SubscribeStatus } from '../../foundation/subscription.js';

export interface GOOSESelectDetail {
  gseControl: Element | undefined;
  dataset: Element | undefined;
}
export type GOOSESelectEvent = CustomEvent<GOOSESelectDetail>;
export function newGOOSESelectEvent(
  gseControl: Element | undefined,
  dataset: Element | undefined,
  eventInitDict?: CustomEventInit<GOOSESelectDetail>,
): GOOSESelectEvent {
  return new CustomEvent<GOOSESelectDetail>('goose-select', {
    bubbles: true,
    composed: true,
    ...eventInitDict,
    detail: { gseControl, dataset, ...eventInitDict?.detail },
  });
}

export interface GooseSubscriptionDetail {
  element: Element;
  subscribeStatus: SubscribeStatus;
}
export type GooseSubscriptionEvent = CustomEvent<GooseSubscriptionDetail>;
export function newGooseSubscriptionEvent(
  element: Element,
  subscribeStatus: SubscribeStatus,
): GooseSubscriptionEvent {
  return new CustomEvent<GooseSubscriptionDetail>('goose-subscription', {
    bubbles: true,
    composed: true,
    detail: { element, subscribeStatus },
  });
}

declare global {
  interface ElementEventMap {
    ['goose-select']: GOOSESelectEvent;
    ['goose-subscription']: GooseSubscriptionEvent;
  }
}
