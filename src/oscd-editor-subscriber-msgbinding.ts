import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdOutlinedSegmentedButton } from '@omicronenergy/oscd-ui/labs/segmentedbutton/OscdOutlinedSegmentedButton.js';
import { OscdOutlinedSegmentedButtonSet } from '@omicronenergy/oscd-ui/labs/segmentedbuttonset/OscdOutlinedSegmentedButtonSet.js';

import OscdSclDialogs from '@omicronenergy/oscd-scl-dialogs/OscdSclDialogs.js';

import { newViewEvent, View, ViewEvent } from './foundation/subscription.js';
import { ServiceType } from './foundation.js';

import { SubscriberList } from './components/subscriber-list.js';
import { ControlBlockList } from './components/control-block-list.js';
import { IedList } from './components/ied-list.js';

const serviceTypeStorageKey = 'oscd-editor-subscriber-msgbinding$serviceType';
const viewStorageKey = 'oscd-editor-subscriber-msgbinding$view';

/** An editor plugin for subscribing IEDs to GOOSE and SMV messages. */
export default class OscdEditorSubscriberMsgBinding extends ScopedElementsMixin(
  LitElement,
) {
  static scopedElements = {
    'oscd-icon': OscdIcon,
    'oscd-outlined-segmented-button': OscdOutlinedSegmentedButton,
    'oscd-outlined-segmented-button-set': OscdOutlinedSegmentedButtonSet,
    'subscriber-list': SubscriberList,
    'control-block-list': ControlBlockList,
    'ied-list': IedList,
    'oscd-scl-dialogs': OscdSclDialogs,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  serviceType: ServiceType =
    (localStorage.getItem(serviceTypeStorageKey) as ServiceType | null) ??
    'goose';

  @state()
  private view: View =
    localStorage.getItem(viewStorageKey) === 'subscriber'
      ? View.SUBSCRIBER
      : View.PUBLISHER;

  @query('div[class="container"]')
  listDiv!: Element;

  @query('oscd-scl-dialogs')
  private sclDialogs!: OscdSclDialogs;

  private handleEditDialogEvent = (event: Event): void => {
    event.stopPropagation();
    const detail = (event as CustomEvent).detail;
    this.sclDialogs.edit(detail);
  };

  constructor() {
    super();
    this.addEventListener('view', ((evt: ViewEvent) => {
      this.view = evt.detail.view;
      localStorage.setItem(
        viewStorageKey,
        this.view === View.PUBLISHER ? 'publisher' : 'subscriber',
      );
      this.requestUpdate();
    }) as EventListener);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('oscd-scl-dialogs-edit', this.handleEditDialogEvent);
  }

  override disconnectedCallback(): void {
    this.removeEventListener(
      'oscd-scl-dialogs-edit',
      this.handleEditDialogEvent,
    );
    super.disconnectedCallback();
  }

  private onServiceTypeChange(serviceType: ServiceType): void {
    this.serviceType = serviceType;
    localStorage.setItem(serviceTypeStorageKey, serviceType);
  }

  private setView(newView: View): void {
    this.listDiv.dispatchEvent(newViewEvent(newView));
  }

  private renderLeftColumn(): TemplateResult {
    return html`<div class="row left-column">
      <oscd-outlined-segmented-button-set class="view-switch">
        <oscd-outlined-segmented-button
          label="${msg('Publishers')}"
          no-checkmark
          ?selected=${this.view === View.PUBLISHER}
          @click=${() => this.setView(View.PUBLISHER)}
        >
        </oscd-outlined-segmented-button>
        <oscd-outlined-segmented-button
          label="${msg('Subscribers')}"
          no-checkmark
          ?selected=${this.view === View.SUBSCRIBER}
          @click=${() => this.setView(View.SUBSCRIBER)}
        >
        </oscd-outlined-segmented-button>
      </oscd-outlined-segmented-button-set>
      ${this.view === View.PUBLISHER
        ? html`<control-block-list
            .docVersion=${this.docVersion}
            .doc=${this.doc}
            .serviceType=${this.serviceType}
          ></control-block-list>`
        : html`<ied-list
            .docVersion=${this.docVersion}
            .doc=${this.doc}
            .serviceType=${this.serviceType}
          ></ied-list>`}
    </div>`;
  }

  private renderSubscriberList(): TemplateResult {
    return html`<subscriber-list
      class="row"
      .docVersion=${this.docVersion}
      .doc=${this.doc}
      .serviceType=${this.serviceType}
    ></subscriber-list>`;
  }

  render(): TemplateResult {
    return html`<div class="wrapper">
      <header class="header">
        <oscd-outlined-segmented-button-set class="service-switch">
          <oscd-outlined-segmented-button
            label="${msg('GOOSE')}"
            no-checkmark
            ?selected=${this.serviceType === 'goose'}
            @click=${() => this.onServiceTypeChange('goose')}
          >
            <oscd-icon slot="icon">gooseIcon</oscd-icon>
          </oscd-outlined-segmented-button>
          <oscd-outlined-segmented-button
            label="${msg('Sampled Values')}"
            no-checkmark
            ?selected=${this.serviceType === 'smv'}
            @click=${() => this.onServiceTypeChange('smv')}
          >
            <oscd-icon slot="icon">smvIcon</oscd-icon>
          </oscd-outlined-segmented-button>
        </oscd-outlined-segmented-button-set>
      </header>
      <div class="container">
        ${this.renderLeftColumn()} ${this.renderSubscriberList()}
      </div>
      <oscd-scl-dialogs></oscd-scl-dialogs>
    </div>`;
  }

  static styles = css`
    :host {
      background-color: var(--oscd-base2);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 12px;
      flex-wrap: wrap;
      background-color: var(--oscd-base2);
    }

    oscd-outlined-segmented-button {
      flex-shrink: 0;
      --md-outlined-segmented-button-selected-container-color: var(
        --oscd-primary,
        #005ac1
      );
      --md-outlined-segmented-button-selected-label-text-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-icon-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-hover-label-text-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-hover-icon-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-focus-label-text-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-focus-icon-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-pressed-label-text-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-pressed-icon-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-hover-state-layer-color: var(
        --oscd-base3,
        #ffffff
      );
      --md-outlined-segmented-button-selected-pressed-state-layer-color: var(
        --oscd-base3,
        #ffffff
      );
    }

    oscd-outlined-segmented-button-set {
      flex-shrink: 0;
    }

    oscd-outlined-segmented-button {
      min-inline-size: 0;
    }

    .service-switch {
      inline-size: min(100%, 28rem);
    }

    .view-switch {
      flex-shrink: 0;
      margin: 8px;
      margin-top: 16px;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      background-color: var(--oscd-base3);
    }

    .left-column control-block-list,
    .left-column ied-list {
      flex: 1 1 auto;
      min-height: 0;
    }

    .container {
      display: flex;
      padding: 8px 6px 16px;
      background-color: var(--oscd-base2);
      flex: 1;
      min-height: 0;
    }

    .row {
      flex: 50%;
      margin: 0px 6px 0px;
      min-width: 300px;
      height: 100%;
      overflow-y: scroll;
    }
  `;
}
