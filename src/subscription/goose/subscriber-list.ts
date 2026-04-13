// src/subscription/goose/subscriber-list.ts
//
// Copied from legacy monorepo and transformed for standalone use.
// Original: legacy/compas-open-scd/packages/plugins/src/editors/subscription/goose/subscriber-list.ts
// Changes:
//   - lit-element → lit + lit/decorators.js
//   - lit-html → lit (nothing)
//   - @openscd/open-scd/src/foundation.js → @openscd/scl-lib (identity)
//   - @openscd/open-scd/src/filtered-list.js → local foundation/filtered-list.ts (ScopedElements)
//   - lit-translate → @lit/localize msg()
//   - Removed @customElement decorator (ScopedElements pattern)
//   - editCount → docVersion
//   - mwc-* registered in scopedElements
//   - Step 5: Replaced mwc-icon → OscdIcon, mwc-list → OscdList, mwc-list-item → OscdListItem,
//     li[divider] → OscdDivider. Slot renames: graphic→start, meta→end.
//     Removed: graphic/hasMeta/noninteractive/value attrs.
//     Added: type="button"|"text", data-value.
//   - Constructor .closest('.container') → connectedCallback/disconnectedCallback
//   - Module-level view state preserved (intentional legacy behavior)
//   - Step 3: Replaced deprecated editor actions with EditV2 via scl-lib subscribe/unsubscribe.
//     Legacy bug (supervision actions dropped via .concat()) is naturally fixed.

import { css, html, nothing, TemplateResult } from 'lit';
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

import { FilteredList } from '../../foundation/filtered-list.js';

import {
  GOOSESelectEvent,
  GooseSubscriptionEvent,
  newGooseSubscriptionEvent,
} from './foundation.js';

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
} from '../../foundation/subscription.js';

/** Defining view outside the class, which makes it persistent. */
let view: View = View.PUBLISHER;

/** An sub element for subscribing and unsubscribing IEDs to GOOSE messages. */
export class SubscriberListGoose extends ScopedElementsMixin(
  SubscriberListContainer,
) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-list': OscdList,
    'oscd-list-item': OscdListItem,
    'oscd-divider': OscdDivider,
    'filtered-list': FilteredList,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  /** Current selected GOOSE message (when in GOOSE Publisher view) */
  currentSelectedGseControl: Element | undefined;

  /** The name of the IED belonging to the current selected GOOSE */
  currentGooseIedName: string | undefined | null;

  private onIEDSelectEvent = (event: IEDSelectEvent): void => {
    if (!event.detail.ied) return;
    this.currentSelectedIed = event.detail.ied!;

    this.resetElements();

    const subscribedInputs = this.currentSelectedIed.querySelectorAll(
      `LN0 > Inputs, LN > Inputs`,
    );

    Array.from(this.doc.querySelectorAll('GSEControl'))
      .filter(cb => cb.hasAttribute('datSet'))
      .forEach(control => {
        const ied = control.closest('IED')!;

        if (
          ied.getAttribute('name') ==
          this.currentSelectedIed?.getAttribute('name')
        )
          return;

        /** If no Inputs is available, it's automatically available. */
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

  private onGOOSESelectEvent = (event: GOOSESelectEvent): void => {
    if (!event.detail.dataset || !event.detail.gseControl) return;

    this.currentSelectedGseControl = event.detail.gseControl;
    this.currentUsedDataset = event.detail.dataset;
    this.currentGooseIedName = this.currentSelectedGseControl
      ?.closest('IED')
      ?.getAttribute('name');

    this.resetElements();

    Array.from(this.doc.querySelectorAll(':root > IED'))
      .filter(ied => ied.getAttribute('name') != this.currentGooseIedName)
      .forEach(ied => {
        const inputElements = ied.querySelectorAll(`LN0 > Inputs, LN > Inputs`);

        let numberOfLinkedExtRefs = 0;

        /**
         * If no Inputs element is found, we can safely say it's not subscribed.
         */
        if (!inputElements) {
          this.availableElements.push({ element: ied });
          return;
        }

        /**
         * Count all the linked ExtRefs.
         */
        this.currentUsedDataset!.querySelectorAll('FCDA').forEach(fcda => {
          inputElements.forEach(inputs => {
            if (getExtRef(inputs, fcda, this.currentSelectedGseControl)) {
              numberOfLinkedExtRefs++;
            }
          });
        });

        /**
         * Make a distinction between not subscribed at all,
         * partially subscribed and fully subscribed.
         */
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

  private onGooseSubscriptionEvent = (event: GooseSubscriptionEvent): void => {
    let iedToSubscribe = event.detail.element;

    if (view == View.SUBSCRIBER) {
      const dataSetName = event.detail.element.getAttribute('datSet');
      this.currentUsedDataset =
        event.detail.element.parentElement?.querySelector(
          `DataSet[name="${dataSetName}"]`,
        );
      this.currentSelectedGseControl = event.detail.element;
      this.currentGooseIedName = event.detail.element
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
    this.currentSelectedGseControl = undefined;

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
        'goose-select',
        this.onGOOSESelectEvent as EventListener,
      );
      parentDiv.addEventListener(
        'goose-subscription',
        this.onGooseSubscriptionEvent as EventListener,
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
        'goose-select',
        this.onGOOSESelectEvent as EventListener,
      );
      parentDiv.removeEventListener(
        'goose-subscription',
        this.onGooseSubscriptionEvent as EventListener,
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
          controlBlock: this.currentSelectedGseControl,
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
        const extRef = getExtRef(inputs, fcda, this.currentSelectedGseControl);
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
          this.currentSelectedGseControl!,
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
          newGooseSubscriptionEvent(element, status ?? SubscribeStatus.None),
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

  renderUnSubscribers(elements: ListElement[]): TemplateResult {
    return html`<oscd-list-item
        type="text"
        data-value="${elements
          .map(element => {
            const id = identity(element.element) as string;
            return typeof id === 'string' ? id : '';
          })
          .join(' ')}"
      >
        <span>${msg('Available to subscribe')}</span>
      </oscd-list-item>
      <oscd-divider></oscd-divider>
      ${elements.length > 0
        ? elements.map(element =>
            this.renderSubscriber(SubscribeStatus.None, element.element),
          )
        : html`<oscd-list-item type="text">
            <span>${msg('None')}</span>
          </oscd-list-item>`}`;
  }

  renderPartiallySubscribers(elements: ListElement[]): TemplateResult {
    return html`<oscd-list-item
        type="text"
        data-value="${elements
          .map(element => {
            const id = identity(element.element) as string;
            return typeof id === 'string' ? id : '';
          })
          .join(' ')}"
      >
        <span>${msg('Partially subscribed')}</span>
      </oscd-list-item>
      <oscd-divider></oscd-divider>
      ${elements.length > 0
        ? elements.map(element =>
            this.renderSubscriber(SubscribeStatus.Partial, element.element),
          )
        : html`<oscd-list-item type="text">
            <span>${msg('None')}</span>
          </oscd-list-item>`}`;
  }

  renderFullSubscribers(): TemplateResult {
    return html`<oscd-list-item
        type="text"
        data-value="${this.subscribedElements
          .map(element => {
            const id = identity(element.element) as string;
            return typeof id === 'string' ? id : '';
          })
          .join(' ')}"
      >
        <span>${msg('Subscribed')}</span>
      </oscd-list-item>
      <oscd-divider></oscd-divider>
      ${this.subscribedElements.length > 0
        ? this.subscribedElements.map(element =>
            this.renderSubscriber(SubscribeStatus.Full, element.element),
          )
        : html`<oscd-list-item type="text">
            <span>${msg('None')}</span>
          </oscd-list-item>`}`;
  }

  renderTitle(): TemplateResult {
    const gseControlName =
      this.currentSelectedGseControl?.getAttribute('name') ?? undefined;

    return view == View.PUBLISHER
      ? html`<h1>
          ${gseControlName
            ? msg(
                `IEDs subscribed to ${this.currentGooseIedName} > ${gseControlName}`,
              )
            : msg('IEDs subscribed to GOOSE')}
        </h1>`
      : html`<h1>
          ${this.currentSelectedIed
            ? msg(
                `GOOSE Messages subscribed to ${this.currentSelectedIed.getAttribute('name')}`,
              )
            : msg('GOOSE Messages subscribed to IED')}
        </h1>`;
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
          ? html`<div class="wrapper">
              <filtered-list>
                ${this.renderFullSubscribers()}
                ${this.renderPartiallySubscribers(
                  this.availableElements.filter(element => element.partial),
                )}
                ${this.renderUnSubscribers(
                  this.availableElements.filter(element => !element.partial),
                )}
              </filtered-list>
            </div>`
          : html`<oscd-list>
              <oscd-list-item type="text">
                <span>${
                  view == View.PUBLISHER
                    ? msg('No control block selected')
                    : msg('No IED selected')
                }</span>
              </oscd-list-item>
            </oscd-list>
          </div>`}
      </section>
    `;
  }

  static styles = css`
    ${styles}

    .wrapper {
      height: 100vh;
      overflow-y: scroll;
    }
  `;
}
