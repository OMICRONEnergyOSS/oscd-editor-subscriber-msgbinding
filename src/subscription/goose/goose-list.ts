// src/subscription/goose/goose-list.ts
//
// Copied from legacy monorepo and transformed for standalone use.
// Original: legacy/compas-open-scd/packages/plugins/src/editors/subscription/goose/goose-list.ts
// Changes:
//   - lit-element → lit + lit/decorators.js
//   - lit-html/directives/class-map → lit/directives/class-map.js
//   - @openscd/open-scd/src/foundation.js → @openscd/scl-lib (identity) + local scl.ts (getNameAttribute) + local wizard.ts (newWizardEvent)
//   - @openscd/open-scd/src/icons/icons.js → local foundation/icons.ts (Step 2), deleted (Step 5, unified OscdIcon)
//   - @openscd/open-scd/src/filtered-list.js → local foundation/filtered-list.ts (ScopedElements)
//   - lit-translate → @lit/localize msg()
//   - Removed @customElement decorator (ScopedElements pattern)
//   - editCount → docVersion
//   - mwc-* registered in scopedElements
//   - Step 5: Replaced mwc-icon → OscdIcon, mwc-list-item → OscdListItem,
//     mwc-icon-button → OscdIconButton, li[divider] → OscdDivider.
//     gooseIcon from icons.ts → unified <oscd-icon>gooseIcon</oscd-icon>.
//     Slot renames: graphic→start, meta→end; removed graphic/hasMeta/noninteractive/value attrs;
//     added type="button"|"text", data-value. Updated CSS selectors.
//   - Global addEventListener('open-doc',...) → connectedCallback/disconnectedCallback
//   - Module-level selectedGseControl/selectedDataSet state preserved (intentional legacy behavior)
//   - Step 6: Replaced edit icon button with context menu (more_vert trigger).
//     Added OscdMenu/OscdMenuItem, control-block-helpers for associated element
//     lookups, and buildRemoveEdits for Remove action.

import { css, html, LitElement, nothing, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { identity } from '@openscd/scl-lib';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { OscdIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdIconButton.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';

import { getNameAttribute } from '../../foundation/scl.js';
import { newEditDialogEditEvent } from '@omicronenergy/oscd-scl-dialogs/oscd-scl-dialogs-events.js';
import { FilteredList } from '../../foundation/filtered-list.js';
import { getOrderedIeds, styles } from '../../foundation/subscription.js';
import { newGOOSESelectEvent } from './foundation.js';
import {
  getAssociatedDataSet,
  getAssociatedGSE,
  buildRemoveEdits,
} from '../../foundation/shared/control-block-helpers.js';

let selectedGseControl: Element | undefined;
let selectedDataSet: Element | undefined | null;

export class GooseList extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list-item': OscdListItem,
    'oscd-icon-button': OscdIconButton,
    'oscd-divider': OscdDivider,
    'oscd-menu': OscdMenu,
    'oscd-menu-item': OscdMenuItem,
    'filtered-list': FilteredList,
  };

  private onOpenDocReset = (): void => {
    selectedGseControl = undefined;
    selectedDataSet = undefined;
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('open-doc', this.onOpenDocReset);
  }

  disconnectedCallback(): void {
    window.removeEventListener('open-doc', this.onOpenDocReset);
    super.disconnectedCallback();
  }

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  /** The control element that the context menu currently targets. */
  @state()
  private menuControlElement: Element | undefined;

  @query('.control-block-menu') private controlBlockMenu!: OscdMenu;

  private onSelect(gseControl: Element): void {
    if (gseControl == selectedGseControl) return;

    const ln = gseControl.parentElement;
    const dataset = ln?.querySelector(
      `DataSet[name=${gseControl.getAttribute('datSet')}]`,
    );

    selectedGseControl = gseControl;
    selectedDataSet = dataset;

    this.dispatchEvent(
      newGOOSESelectEvent(selectedGseControl, selectedDataSet!),
    );

    this.requestUpdate();
  }

  private openControlMenu(event: Event, control: Element): void {
    event.stopPropagation();
    this.menuControlElement = control;
    const button = event.currentTarget as HTMLElement;
    this.controlBlockMenu.anchorElement = button;
    this.controlBlockMenu.show();
  }

  private onMenuEdit(): void {
    if (!this.menuControlElement) return;
    this.dispatchEvent(newEditDialogEditEvent(this.menuControlElement));
  }

  private onMenuEditDataSet(): void {
    if (!this.menuControlElement) return;
    const dataSet = getAssociatedDataSet(this.menuControlElement);
    if (dataSet) {
      this.dispatchEvent(newEditDialogEditEvent(dataSet));
    }
  }

  private onMenuEditCommunication(): void {
    if (!this.menuControlElement) return;
    const gse = getAssociatedGSE(this.menuControlElement);
    if (gse) {
      this.dispatchEvent(newEditDialogEditEvent(gse));
    }
  }

  private onMenuRemove(): void {
    if (!this.menuControlElement) return;
    const edits = buildRemoveEdits(this.menuControlElement);
    if (edits.length > 0) {
      this.dispatchEvent(
        newEditEventV2(edits, {
          title: msg('Remove GSEControl'),
        }),
      );
    }
  }

  renderGoose(gseControl: Element): TemplateResult {
    return html`<oscd-list-item
      @click=${() => this.onSelect(gseControl)}
      type="button"
      data-value="${identity(gseControl)}"
    >
      <oscd-icon slot="start">gooseIcon</oscd-icon>
      <span>${gseControl.getAttribute('name')}</span>
      <oscd-icon-button
        class="${classMap({
          hidden: gseControl !== selectedGseControl,
        })}"
        slot="end"
        @click=${(e: Event) => this.openControlMenu(e, gseControl)}
        ><oscd-icon>more_vert</oscd-icon></oscd-icon-button
      >
    </oscd-list-item>`;
  }

  private renderControlBlockMenu(): TemplateResult {
    const control = this.menuControlElement;
    const hasDataSet = control ? !!getAssociatedDataSet(control) : false;
    const hasCommunication = control ? !!getAssociatedGSE(control) : false;

    return html`<oscd-menu class="control-block-menu" positioning="popover">
      <oscd-menu-item @click=${() => this.onMenuEdit()}>
        <div slot="headline">${msg('Edit')}</div>
      </oscd-menu-item>
      ${hasDataSet
        ? html`<oscd-menu-item @click=${() => this.onMenuEditDataSet()}>
            <div slot="headline">${msg('Edit DataSet')}</div>
          </oscd-menu-item>`
        : nothing}
      ${hasCommunication
        ? html`<oscd-menu-item @click=${() => this.onMenuEditCommunication()}>
            <div slot="headline">${msg('Edit Communication')}</div>
          </oscd-menu-item>`
        : nothing}
      <oscd-menu-item @click=${() => this.onMenuRemove()}>
        <div slot="headline">${msg('Remove')}</div>
      </oscd-menu-item>
    </oscd-menu>`;
  }

  protected updated(): void {
    this.dispatchEvent(
      newGOOSESelectEvent(selectedGseControl, selectedDataSet ?? undefined),
    );
  }

  protected firstUpdated(): void {
    selectedGseControl = undefined;
    selectedDataSet = undefined;
  }

  render(): TemplateResult {
    return html` <section tabindex="0">
      <h1>${msg('GOOSE Publishers')}</h1>
      <filtered-list activatable>
        ${getOrderedIeds(this.doc).map(
          ied => html`
            <oscd-list-item
              type="text"
              data-value="${Array.from(ied.querySelectorAll('GSEControl'))
                .filter(cb => cb.hasAttribute('datSet'))
                .map(element => {
                  const id = identity(element) as string;
                  return typeof id === 'string' ? id : '';
                })
                .join(' ')}"
            >
              <span>${getNameAttribute(ied)}</span>
              <oscd-icon slot="start">developer_board</oscd-icon>
            </oscd-list-item>
            <oscd-divider></oscd-divider>
            ${Array.from(
              ied.querySelectorAll(
                ':scope > AccessPoint > Server > LDevice > LN0 > GSEControl',
              ),
            )
              .filter(cb => cb.hasAttribute('datSet'))
              .map(control => this.renderGoose(control))}
          `,
        )}
      </filtered-list>
      ${this.renderControlBlockMenu()}
    </section>`;
  }

  static styles = css`
    ${styles}

    oscd-list-item {
      --mdc-list-item-meta-size: 48px;
    }

    oscd-icon-button.hidden {
      display: none;
    }

    oscd-list-item.hidden[type='text'] + oscd-divider {
      display: none;
    }
  `;
}
