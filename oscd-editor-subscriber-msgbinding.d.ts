import { LitElement, TemplateResult } from 'lit';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdOutlinedSegmentedButton } from '@omicronenergy/oscd-ui/labs/segmentedbutton/OscdOutlinedSegmentedButton.js';
import { OscdOutlinedSegmentedButtonSet } from '@omicronenergy/oscd-ui/labs/segmentedbuttonset/OscdOutlinedSegmentedButtonSet.js';
import OscdSclDialogs from '@omicronenergy/oscd-scl-dialogs/OscdSclDialogs.js';
import { ServiceType } from './foundation.js';
import { SubscriberList } from './components/subscriber-list.js';
import { ControlBlockList } from './components/control-block-list.js';
import { IedList } from './components/ied-list.js';
declare const OscdEditorSubscriberMsgBinding_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
/** An editor plugin for subscribing IEDs to GOOSE and SMV messages. */
export default class OscdEditorSubscriberMsgBinding extends OscdEditorSubscriberMsgBinding_base {
    static scopedElements: {
        'oscd-icon': typeof OscdIcon;
        'oscd-outlined-segmented-button': typeof OscdOutlinedSegmentedButton;
        'oscd-outlined-segmented-button-set': typeof OscdOutlinedSegmentedButtonSet;
        'subscriber-list': typeof SubscriberList;
        'control-block-list': typeof ControlBlockList;
        'ied-list': typeof IedList;
        'oscd-scl-dialogs': typeof OscdSclDialogs;
    };
    doc: XMLDocument;
    docVersion?: unknown;
    serviceType: ServiceType;
    private view;
    listDiv: Element;
    private sclDialogs;
    private handleEditDialogEvent;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private onServiceTypeChange;
    private setView;
    private renderLeftColumn;
    private renderSubscriberList;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
