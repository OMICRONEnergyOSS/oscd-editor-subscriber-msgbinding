import { LitElement, TemplateResult } from 'lit';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { VirtualizedFilteredList } from '../foundation/virtualized-filtered-list.js';
declare const IedList_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class IedList extends IedList_base {
    static scopedElements: {
        'oscd-icon': typeof OscdIcon;
        'oscd-list-item': typeof OscdListItem;
        'virtualized-filtered-list': typeof VirtualizedFilteredList;
    };
    doc: XMLDocument;
    docVersion?: unknown;
    serviceType?: 'goose' | 'smv';
    private selectedIed;
    private onOpenDocReset;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private onIedSelect;
    protected updated(): void;
    protected firstUpdated(): void;
    private renderIedItem;
    private matchIedItem;
    private iedKey;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
