import { css, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';

import { getNameAttribute } from '../foundation/scl.js';
import { VirtualizedFilteredList } from '../foundation/virtualized-filtered-list.js';
import {
  getOrderedIeds,
  newIEDSelectEvent,
  styles,
} from '../foundation/subscription.js';

let selectedIed: Element | undefined;

export class IedList extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list-item': OscdListItem,
    'virtualized-filtered-list': VirtualizedFilteredList,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  serviceType?: 'goose' | 'smv';

  private onOpenDocReset = (): void => {
    selectedIed = undefined;
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('open-doc', this.onOpenDocReset);
  }

  disconnectedCallback(): void {
    window.removeEventListener('open-doc', this.onOpenDocReset);
    super.disconnectedCallback();
  }

  private onIedSelect(element: Element): void {
    selectedIed = element;
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  protected updated(): void {
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  protected firstUpdated(): void {
    selectedIed = undefined;
  }

  private renderIedItem = (item: unknown): TemplateResult => {
    const ied = item as Element;
    return html`
      <oscd-list-item @click=${() => this.onIedSelect(ied)} type="button">
        <span>${getNameAttribute(ied)}</span>
        <oscd-icon slot="start">developer_board</oscd-icon>
      </oscd-list-item>
    `;
  };

  private matchIedItem = (item: unknown, regex: RegExp): boolean => {
    const ied = item as Element;
    return regex.test(getNameAttribute(ied) ?? '');
  };

  private iedKey = (item: unknown): string => {
    const ied = item as Element;
    return getNameAttribute(ied) ?? '';
  };

  render(): TemplateResult {
    return html` <section tabindex="0">
      <virtualized-filtered-list
        .items=${getOrderedIeds(this.doc)}
        .renderItem=${this.renderIedItem}
        .matchItem=${this.matchIedItem}
        .keyFunction=${this.iedKey}
      ></virtualized-filtered-list>
    </section>`;
  }

  static styles = css`
    ${styles}

    :host {
      display: flex;
      flex-direction: column;
    }

    section {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
  `;
}
