import { PropertyValues, TemplateResult } from 'lit';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { VirtualizedFilteredList } from '../foundation/virtualized-filtered-list.js';
import { ServiceType } from '../foundation.js';
import { SubscriberListContainer, SubscribeStatus } from '../foundation/subscription.js';
declare const SubscriberList_base: typeof SubscriberListContainer & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
/** An element for subscribing and unsubscribing IEDs to GOOSE/SMV messages. */
export declare class SubscriberList extends SubscriberList_base {
    static scopedElements: {
        'oscd-icon': typeof OscdIcon;
        'oscd-list': typeof OscdList;
        'oscd-list-item': typeof OscdListItem;
        'oscd-divider': typeof OscdDivider;
        'virtualized-filtered-list': typeof VirtualizedFilteredList;
    };
    doc: XMLDocument;
    docVersion?: unknown;
    serviceType: ServiceType;
    /** Current selected control block (when in Publisher view) */
    private currentSelectedControl;
    /** The name of the IED belonging to the current selected control */
    private currentControlIedName;
    private get controlSelector();
    protected willUpdate(changedProperties: PropertyValues): void;
    private onIEDSelectEvent;
    private onControlSelectEvent;
    private onControlSubscriptionEvent;
    private onViewChange;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private subscribeIed;
    private unsubscribeIed;
    renderSubscriber(status: SubscribeStatus, element: Element): TemplateResult;
    private buildSubscriberGroup;
    private buildRows;
    private renderRow;
    private matchRow;
    private rowKey;
    private get serviceLabel();
    renderTitle(): TemplateResult;
    protected firstUpdated(): void;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
