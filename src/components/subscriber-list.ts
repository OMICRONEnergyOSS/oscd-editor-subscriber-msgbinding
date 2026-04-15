import { css, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { identity, subscribe, unsubscribe } from '@openscd/scl-lib';
import type { EditV2 } from '@openscd/oscd-api';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdList } from '@omicronenergy/oscd-ui/list/OscdList.js';
import { OscdListItem } from '@omicronenergy/oscd-ui/list/OscdListItem.js';
import { OscdDivider } from '@omicronenergy/oscd-ui/divider/OscdDivider.js';

import { VirtualizedFilteredList } from '../foundation/virtualized-filtered-list.js';

import {
  ServiceType,
  ControlSelectEvent,
  ControlSubscriptionEvent,
  newControlSubscriptionEvent,
} from '../foundation.js';

import {
  getExistingSupervision,
  getExtRef,
  getFirstSubscribedExtRef,
  IEDSelectEvent,
  ListElement,
  styles,
  SubscriberListContainer,
  SubscribeStatus,
  View,
  ViewEvent,
} from '../foundation/subscription.js';

interface SectionRow {
  type: 'section';
  key: string;
  headline: string;
}

interface DividerRow {
  type: 'divider';
  key: string;
}

interface EmptyRow {
  type: 'empty';
  key: string;
  headline: string;
}

interface SubscriberRow {
  type: 'subscriber';
  key: string;
  element: Element;
  status: SubscribeStatus;
  searchText: string;
}

type SubscriberListRow = SectionRow | DividerRow | EmptyRow | SubscriberRow;

/** Defining view outside the class, which makes it persistent. */
let view: View = View.PUBLISHER;

/** An element for subscribing and unsubscribing IEDs to GOOSE/SMV messages. */
export class SubscriberList extends ScopedElementsMixin(
  SubscriberListContainer,
) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list': OscdList,
    'oscd-list-item': OscdListItem,
    'oscd-divider': OscdDivider,
    'virtualized-filtered-list': VirtualizedFilteredList,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  serviceType: ServiceType = 'goose';

  /** Current selected control block (when in Publisher view) */
  private currentSelectedControl: Element | undefined;

  /** The name of the IED belonging to the current selected control */
  private currentControlIedName: string | undefined | null;

  private get controlSelector(): string {
    return this.serviceType === 'goose' ? 'GSEControl' : 'SampledValueControl';
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('serviceType')) {
      this.currentSelectedControl = undefined;
      this.currentControlIedName = undefined;
      this.currentSelectedIed = undefined;
      this.resetElements();
    }
  }

  private onIEDSelectEvent = (event: IEDSelectEvent): void => {
    if (!event.detail.ied) return;
    this.currentSelectedIed = event.detail.ied!;

    this.resetElements();

    const subscribedInputs = this.currentSelectedIed.querySelectorAll(
      `LN0 > Inputs, LN > Inputs`,
    );

    Array.from(this.doc.querySelectorAll(this.controlSelector))
      .filter(cb => cb.hasAttribute('datSet'))
      .forEach(control => {
        const ied = control.closest('IED')!;

        if (
          ied.getAttribute('name') ==
          this.currentSelectedIed?.getAttribute('name')
        )
          return;

        if (subscribedInputs.length == 0) {
          this.availableElements.push({ element: control });
          return;
        }

        let numberOfLinkedExtRefs = 0;
        const dataSet = ied.querySelector(
          `DataSet[name="${control.getAttribute('datSet')}"]`,
        );

        if (!dataSet) return;

        dataSet!.querySelectorAll('FCDA').forEach(fcda => {
          subscribedInputs.forEach(inputs => {
            if (getExtRef(inputs, fcda, control)) {
              numberOfLinkedExtRefs++;
            }
          });
        });

        if (numberOfLinkedExtRefs == 0) {
          this.availableElements.push({ element: control });
          return;
        }

        if (numberOfLinkedExtRefs >= dataSet!.querySelectorAll('FCDA').length) {
          this.subscribedElements.push({ element: control });
        } else {
          this.availableElements.push({ element: control, partial: true });
        }
      });

    this.requestUpdate();
  };

  private onControlSelectEvent = (event: ControlSelectEvent): void => {
    if (!event.detail.dataset || !event.detail.controlBlock) return;

    this.currentSelectedControl = event.detail.controlBlock;
    this.currentUsedDataset = event.detail.dataset;
    this.currentControlIedName = this.currentSelectedControl
      ?.closest('IED')
      ?.getAttribute('name');

    this.resetElements();

    Array.from(this.doc.querySelectorAll(':root > IED'))
      .filter(ied => ied.getAttribute('name') != this.currentControlIedName)
      .forEach(ied => {
        const inputElements = ied.querySelectorAll(`LN0 > Inputs, LN > Inputs`);

        let numberOfLinkedExtRefs = 0;

        if (!inputElements) {
          this.availableElements.push({ element: ied });
          return;
        }

        this.currentUsedDataset!.querySelectorAll('FCDA').forEach(fcda => {
          inputElements.forEach(inputs => {
            if (getExtRef(inputs, fcda, this.currentSelectedControl)) {
              numberOfLinkedExtRefs++;
            }
          });
        });

        if (numberOfLinkedExtRefs == 0) {
          this.availableElements.push({ element: ied });
          return;
        }

        if (
          numberOfLinkedExtRefs >=
          this.currentUsedDataset!.querySelectorAll('FCDA').length
        ) {
          this.subscribedElements.push({ element: ied });
        } else {
          this.availableElements.push({ element: ied, partial: true });
        }
      });

    this.requestUpdate();
  };

  private onControlSubscriptionEvent = (
    event: ControlSubscriptionEvent,
  ): void => {
    let iedToSubscribe = event.detail.element;

    if (view == View.SUBSCRIBER) {
      const dataSetName = event.detail.element.getAttribute('datSet');
      this.currentUsedDataset =
        event.detail.element.parentElement?.querySelector(
          `DataSet[name="${dataSetName}"]`,
        );
      this.currentSelectedControl = event.detail.element;
      this.currentControlIedName = event.detail.element
        .closest('IED')
        ?.getAttribute('name');
      iedToSubscribe = this.currentSelectedIed!;
    }

    switch (event.detail.subscribeStatus) {
      case SubscribeStatus.Full: {
        this.unsubscribeIed(iedToSubscribe);
        break;
      }
      case SubscribeStatus.Partial: {
        this.subscribeIed(iedToSubscribe);
        break;
      }
      case SubscribeStatus.None: {
        this.subscribeIed(iedToSubscribe);
        break;
      }
    }
  };

  private onViewChange = (event: ViewEvent): void => {
    view = event.detail.view;

    this.currentSelectedIed = undefined;
    this.currentSelectedControl = undefined;

    this.resetElements();
    this.requestUpdate();
  };

  connectedCallback(): void {
    super.connectedCallback();
    const parentDiv = this.closest('.container');
    if (parentDiv) {
      parentDiv.addEventListener(
        'ied-select',
        this.onIEDSelectEvent as EventListener,
      );
      parentDiv.addEventListener(
        'control-select',
        this.onControlSelectEvent as EventListener,
      );
      parentDiv.addEventListener(
        'control-subscription',
        this.onControlSubscriptionEvent as EventListener,
      );
      parentDiv.addEventListener('view', this.onViewChange as EventListener);
    }
  }

  disconnectedCallback(): void {
    const parentDiv = this.closest('.container');
    if (parentDiv) {
      parentDiv.removeEventListener(
        'ied-select',
        this.onIEDSelectEvent as EventListener,
      );
      parentDiv.removeEventListener(
        'control-select',
        this.onControlSelectEvent as EventListener,
      );
      parentDiv.removeEventListener(
        'control-subscription',
        this.onControlSubscriptionEvent as EventListener,
      );
      parentDiv.removeEventListener('view', this.onViewChange as EventListener);
    }
    super.disconnectedCallback();
  }

  private subscribeIed(ied: Element): void {
    if (!ied.querySelector('LN0')) return;

    const allEdits: EditV2[] = [];

    this.currentUsedDataset!.querySelectorAll('FCDA').forEach(fcda => {
      const edits = subscribe({
        sink: ied.querySelector('LN0')!,
        source: {
          fcda,
          controlBlock: this.currentSelectedControl,
        },
      });
      allEdits.push(...edits);
    });

    if (allEdits.length > 0) {
      this.dispatchEvent(
        newEditEventV2(allEdits, { title: msg('Connect data attribute') }),
      );
    }
  }

  private unsubscribeIed(ied: Element): void {
    const extRefs: Element[] = [];
    ied.querySelectorAll('LN0 > Inputs, LN > Inputs').forEach(inputs => {
      this.currentUsedDataset!.querySelectorAll('FCDA').forEach(fcda => {
        const extRef = getExtRef(inputs, fcda, this.currentSelectedControl);
        if (extRef) extRefs.push(extRef);
      });
    });

    if (extRefs.length === 0) return;

    const edits = unsubscribe(extRefs);
    if (edits.length > 0) {
      this.dispatchEvent(
        newEditEventV2(edits, { title: msg('Disconnect data attribute') }),
      );
    }
  }

  renderSubscriber(status: SubscribeStatus, element: Element): TemplateResult {
    let firstSubscribedExtRef: Element | null = null;
    let supervisionNode: Element | null = null;
    if (status !== SubscribeStatus.None) {
      if (view === View.PUBLISHER) {
        firstSubscribedExtRef = getFirstSubscribedExtRef(
          this.currentSelectedControl!,
          element,
        );
        supervisionNode = getExistingSupervision(firstSubscribedExtRef!);
      } else {
        firstSubscribedExtRef = getFirstSubscribedExtRef(
          element,
          this.currentSelectedIed!,
        );
        supervisionNode = getExistingSupervision(firstSubscribedExtRef!);
      }
    }
    return html` <oscd-list-item
      @click=${() => {
        this.dispatchEvent(
          newControlSubscriptionEvent(element, status ?? SubscribeStatus.None),
        );
      }}
      type="button"
    >
      <span
        >${view == View.PUBLISHER
          ? element.getAttribute('name')
          : element.getAttribute('name') +
            ` (${element.closest('IED')?.getAttribute('name')})`}</span
      >
      <oscd-icon slot="start"
        >${status == SubscribeStatus.Full ? html`clear` : html`add`}</oscd-icon
      >
      ${supervisionNode !== null
        ? html`<oscd-icon title="${identity(supervisionNode)}" slot="end"
            >monitor_heart</oscd-icon
          >`
        : nothing}
    </oscd-list-item>`;
  }

  private buildSubscriberGroup(
    headline: string,
    keyPrefix: string,
    emptyHeadline: string,
    elements: ListElement[],
    status: SubscribeStatus,
  ): SubscriberListRow[] {
    const result: SubscriberListRow[] = [
      { type: 'section', key: `${keyPrefix}-header`, headline },
      { type: 'divider', key: `${keyPrefix}-divider` },
    ];

    if (elements.length > 0) {
      result.push(
        ...elements.map(el => {
          const id = identity(el.element) as string;
          return {
            type: 'subscriber' as const,
            key: `${keyPrefix}-${typeof id === 'string' ? id : ''}`,
            element: el.element,
            status,
            searchText: `${el.element.getAttribute('name') ?? ''} ${typeof id === 'string' ? id : ''}`,
          };
        }),
      );
    } else {
      result.push({
        type: 'empty',
        key: `${keyPrefix}-empty`,
        headline: emptyHeadline,
      });
    }

    return result;
  }

  private buildRows(): SubscriberListRow[] {
    return [
      ...this.buildSubscriberGroup(
        msg('Subscribed'),
        'subscribed',
        msg('None'),
        this.subscribedElements,
        SubscribeStatus.Full,
      ),
      ...this.buildSubscriberGroup(
        msg('Partially subscribed'),
        'partial',
        msg('None'),
        this.availableElements.filter(el => el.partial),
        SubscribeStatus.Partial,
      ),
      ...this.buildSubscriberGroup(
        msg('Available to subscribe'),
        'available',
        msg('None'),
        this.availableElements.filter(el => !el.partial),
        SubscribeStatus.None,
      ),
    ];
  }

  private renderRow = (item: unknown): TemplateResult => {
    const row = item as SubscriberListRow;
    if (row.type === 'section') {
      return html`<oscd-list-item type="text">
        <span>${row.headline}</span>
      </oscd-list-item>`;
    }
    if (row.type === 'divider') {
      return html`<oscd-divider></oscd-divider>`;
    }
    if (row.type === 'empty') {
      return html`<oscd-list-item type="text">
        <span>${row.headline}</span>
      </oscd-list-item>`;
    }
    return this.renderSubscriber(row.status, row.element);
  };

  private matchRow = (item: unknown, regex: RegExp): boolean => {
    const row = item as SubscriberListRow;
    if (row.type === 'subscriber') {
      return regex.test(row.searchText);
    }
    return true;
  };

  private rowKey = (item: unknown): string => {
    return (item as SubscriberListRow).key;
  };

  private get serviceLabel(): string {
    return this.serviceType === 'goose' ? 'GOOSE' : 'SMV';
  }

  renderTitle(): TemplateResult {
    const controlName =
      this.currentSelectedControl?.getAttribute('name') ?? undefined;

    return view == View.PUBLISHER
      ? html`<h2>
          ${controlName
            ? msg(
                `IEDs subscribed to ${this.currentControlIedName} > ${controlName}`,
              )
            : msg(`IEDs subscribed to ${this.serviceLabel}`)}
        </h2>`
      : html`<h2>
          ${this.currentSelectedIed
            ? msg(
                `${this.serviceLabel} Messages subscribed to ${this.currentSelectedIed.getAttribute('name')}`,
              )
            : msg(`${this.serviceLabel} Messages subscribed to IED`)}
        </h2>`;
  }

  protected firstUpdated(): void {
    this.currentSelectedIed = undefined;
  }

  render(): TemplateResult {
    return html`
      <section tabindex="0">
        ${this.renderTitle()}
        ${this.availableElements.length != 0 ||
        this.subscribedElements.length != 0
          ? html`<virtualized-filtered-list
              .items=${this.buildRows()}
              .renderItem=${this.renderRow}
              .matchItem=${this.matchRow}
              .keyFunction=${this.rowKey}
            ></virtualized-filtered-list>`
          : html`<div class="empty-state">
              <oscd-icon class="empty-state__icon">list_alt_check</oscd-icon>
              <h3 class="empty-state__title">
                ${view == View.PUBLISHER
                  ? msg('No control block selected')
                  : msg('No IED selected')}
              </h3>
            </div> `}
      </section>
    `;
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

    .empty-state {
      font-family: var(--oscd-font-family, 'Roboto', sans-serif);
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 12px;
      padding: 32px 24px;
      box-sizing: border-box;
      background-color: var(--oscd-base2);
    }

    .empty-state__icon {
      font-size: 128px;
      inline-size: 128px;
      block-size: 128px;
      line-height: 1;
      color: var(--oscd-base01);
      opacity: 0.7;
    }

    .empty-state__title {
      margin: 0;
      font-size: 1.125rem;
      line-height: 1.4;
      font-weight: 500;
      color: var(--oscd-base01);
    }

    .empty-state__description {
      margin: 0;
      max-width: 32rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(
        --oscd-base01,
        var(--md-sys-color-on-surface-variant, #49454f)
      );
    }
  `;
}
