import {
  css,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from 'lit';
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

import { getNameAttribute } from '../foundation/scl.js';
import { newEditDialogEditEvent } from '@omicronenergy/oscd-scl-dialogs/oscd-scl-dialogs-events.js';
import { VirtualizedFilteredList } from '../foundation/virtualized-filtered-list.js';
import { getOrderedIeds, styles } from '../foundation/subscription.js';
import { ServiceType, newControlSelectEvent } from '../foundation.js';
import {
  getAssociatedDataSet,
  getAssociatedCommunication,
  getAssociatedSmvOpts,
  buildRemoveEdits,
} from '../foundation/control-block-helpers.js';

interface IedHeaderRow {
  type: 'ied-header';
  key: string;
  ied: Element;
  searchText: string;
}

interface IedDividerRow {
  type: 'ied-divider';
  key: string;
}

interface ControlRow {
  type: 'control';
  key: string;
  control: Element;
  searchText: string;
}

type ControlBlockRow = IedHeaderRow | IedDividerRow | ControlRow;

export class ControlBlockList extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list-item': OscdListItem,
    'oscd-icon-button': OscdIconButton,
    'oscd-divider': OscdDivider,
    'oscd-menu': OscdMenu,
    'oscd-menu-item': OscdMenuItem,
    'virtualized-filtered-list': VirtualizedFilteredList,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  serviceType: ServiceType = 'goose';

  @state()
  private menuControlElement: Element | undefined;

  @query('.control-block-menu') private controlBlockMenu!: OscdMenu;

  private selectedControl: Element | undefined;

  private selectedDataSet: Element | undefined | null;

  private get controlSelector(): string {
    return this.serviceType === 'goose' ? 'GSEControl' : 'SampledValueControl';
  }

  private get controlIcon(): string {
    return this.serviceType === 'goose' ? 'gooseIcon' : 'smvIcon';
  }

  private onOpenDocReset = (): void => {
    this.selectedControl = undefined;
    this.selectedDataSet = undefined;
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('open-doc', this.onOpenDocReset);
  }

  disconnectedCallback(): void {
    window.removeEventListener('open-doc', this.onOpenDocReset);
    super.disconnectedCallback();
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('serviceType')) {
      this.selectedControl = undefined;
      this.selectedDataSet = undefined;
    }
  }

  private onSelect(control: Element): void {
    if (control === this.selectedControl) return;

    const ln = control.parentElement;
    const dataset = ln?.querySelector(
      `DataSet[name=${control.getAttribute('datSet')}]`,
    );

    this.selectedControl = control;
    this.selectedDataSet = dataset;

    this.dispatchEvent(
      newControlSelectEvent(this.selectedControl, this.selectedDataSet!),
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

  private onMenuEditSmvOpts(): void {
    if (!this.menuControlElement) return;
    const smvOpts = getAssociatedSmvOpts(this.menuControlElement);
    if (smvOpts) {
      this.dispatchEvent(newEditDialogEditEvent(smvOpts));
    }
  }

  private onMenuEditCommunication(): void {
    if (!this.menuControlElement) return;
    const communication = getAssociatedCommunication(this.menuControlElement);
    if (communication) {
      this.dispatchEvent(newEditDialogEditEvent(communication));
    }
  }

  private onMenuRemove(): void {
    if (!this.menuControlElement) return;
    const edits = buildRemoveEdits(this.menuControlElement);
    if (edits.length > 0) {
      this.dispatchEvent(
        newEditEventV2(edits, {
          title:
            this.serviceType === 'goose'
              ? msg('Remove GSEControl')
              : msg('Remove SampledValueControl'),
        }),
      );
    }
  }

  private renderControl(control: Element): TemplateResult {
    const classes = {
      selected: this.selectedControl === control,
    };

    return html`<oscd-list-item
      type="button"
      class="${classMap(classes)}"
      @click=${() => this.onSelect(control)}
      data-value="${identity(control)}"
    >
      <oscd-icon slot="start">${this.controlIcon}</oscd-icon>
      <span>${control.getAttribute('name')}</span>
      <oscd-icon-button
        class="${classMap({
          hidden: control !== this.selectedControl,
        })}"
        slot="end"
        @click=${(e: Event) => this.openControlMenu(e, control)}
        ><oscd-icon>more_vert</oscd-icon></oscd-icon-button
      >
    </oscd-list-item>`;
  }

  private renderControlBlockMenu(): TemplateResult {
    const control = this.menuControlElement;
    const hasDataSet = control ? !!getAssociatedDataSet(control) : false;
    const hasCommunication = control
      ? !!getAssociatedCommunication(control)
      : false;
    const hasSmvOpts =
      this.serviceType === 'smv' && control
        ? !!getAssociatedSmvOpts(control)
        : false;

    return html`<oscd-menu class="control-block-menu" positioning="popover">
      <oscd-menu-item @click=${() => this.onMenuEdit()}>
        <div slot="headline">${msg('Edit')}</div>
      </oscd-menu-item>
      ${hasDataSet
        ? html`<oscd-menu-item @click=${() => this.onMenuEditDataSet()}>
            <div slot="headline">${msg('Edit DataSet')}</div>
          </oscd-menu-item>`
        : nothing}
      ${hasSmvOpts
        ? html`<oscd-menu-item @click=${() => this.onMenuEditSmvOpts()}>
            <div slot="headline">${msg('Edit SmvOpts')}</div>
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
      newControlSelectEvent(
        this.selectedControl,
        this.selectedDataSet ?? undefined,
      ),
    );
  }

  protected firstUpdated(): void {
    this.selectedControl = undefined;
    this.selectedDataSet = undefined;
  }

  private buildRows(): ControlBlockRow[] {
    const rows: ControlBlockRow[] = [];
    const selector = `:scope > AccessPoint > Server > LDevice > LN0 > ${this.controlSelector}`;

    for (const ied of getOrderedIeds(this.doc)) {
      const controls = Array.from(ied.querySelectorAll(selector)).filter(cb =>
        cb.hasAttribute('datSet'),
      );

      const iedName = getNameAttribute(ied) ?? '';
      const controlSearchText = controls
        .map(element => {
          const id = identity(element) as string;
          return typeof id === 'string' ? id : '';
        })
        .join(' ');

      rows.push({
        type: 'ied-header',
        key: `ied-${iedName}`,
        ied,
        searchText: `${iedName} ${controlSearchText}`,
      });

      rows.push({
        type: 'ied-divider',
        key: `ied-divider-${iedName}`,
      });

      for (const control of controls) {
        const id = identity(control) as string;
        rows.push({
          type: 'control',
          key: `ctrl-${typeof id === 'string' ? id : ''}`,
          control,
          searchText: `${iedName} ${control.getAttribute('name') ?? ''} ${typeof id === 'string' ? id : ''}`,
        });
      }
    }
    return rows;
  }

  private renderRow = (item: unknown): TemplateResult => {
    const row = item as ControlBlockRow;

    if (row.type === 'ied-header') {
      return html`
        <oscd-list-item type="text">
          <span>${getNameAttribute(row.ied)}</span>
          <oscd-icon slot="start">developer_board</oscd-icon>
        </oscd-list-item>
      `;
    }
    if (row.type === 'ied-divider') {
      return html`<oscd-divider></oscd-divider>`;
    }
    return this.renderControl(row.control);
  };

  private matchRow = (item: unknown, regex: RegExp): boolean => {
    const row = item as ControlBlockRow;
    if (row.type === 'ied-divider') return true;
    return regex.test(row.searchText);
  };

  private rowKey = (item: unknown): string => {
    return (item as ControlBlockRow).key;
  };

  render(): TemplateResult {
    return html` <section>
      <virtualized-filtered-list
        .items=${this.buildRows()}
        .renderItem=${this.renderRow}
        .matchItem=${this.matchRow}
        .keyFunction=${this.rowKey}
      ></virtualized-filtered-list>
      ${this.renderControlBlockMenu()}
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
