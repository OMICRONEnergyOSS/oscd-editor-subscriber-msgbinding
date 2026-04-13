// src/subscription/ied-list.ts
//
// Copied from legacy monorepo and transformed for standalone use.
// Original: legacy/compas-open-scd/packages/plugins/src/editors/subscription/ied-list.ts
// Changes:
//   - lit-element → lit + lit/decorators.js
//   - @openscd/open-scd/src/foundation.js → local foundation/scl.ts (getNameAttribute)
//   - @openscd/open-scd/src/filtered-list.js → local foundation/filtered-list.ts (ScopedElements)
//   - lit-translate → @lit/localize msg()
//   - Removed @customElement decorator (ScopedElements pattern)
//   - editCount → docVersion
//   - mwc-* registered in scopedElements
//   - Step 5: Replaced mwc-icon → OscdIcon, mwc-list-item → OscdListItem
//     Slot renames: graphic→start; removed graphic="icon" attr; added type="button"
//   - Global addEventListener('open-doc',...) → connectedCallback/disconnectedCallback
//   - Module-level selectedIed state preserved (intentional legacy behavior)

import { css, html, LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';

import { getNameAttribute } from '../foundation/scl.js';
import { FilteredList } from '../foundation/filtered-list.js';
import {
  getOrderedIeds,
  newIEDSelectEvent,
  styles,
} from '../foundation/subscription.js';

let selectedIed: Element | undefined;

const serviceTypeLabels: Record<string, string> = {
  goose: 'GOOSE Subscribers',
  smv: 'SMV Subscribers',
};

export class IedList extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list-item': OscdListItem,
    'filtered-list': FilteredList,
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

  render(): TemplateResult {
    return html` <section tabindex="0">
      <h1>
        ${serviceTypeLabels[this.serviceType ?? ''] ?? msg('Subscribers')}
      </h1>
      <filtered-list activatable>
        ${getOrderedIeds(this.doc).map(
          ied => html`
            <oscd-list-item @click=${() => this.onIedSelect(ied)} type="button">
              <span>${getNameAttribute(ied)}</span>
              <oscd-icon slot="start">developer_board</oscd-icon>
            </oscd-list-item>
          `,
        )}
      </filtered-list>
    </section>`;
  }

  static styles = css`
    ${styles}
  `;
}
