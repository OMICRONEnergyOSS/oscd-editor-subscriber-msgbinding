import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { OscdRadio } from '@omicronenergy/oscd-ui/radio/OscdRadio.js';

import OscdSclDialogs from '@omicronenergy/oscd-scl-dialogs/OscdSclDialogs.js';

import { newViewEvent, View, ViewEvent } from './foundation/subscription.js';

import { SubscriberListGoose } from './subscription/goose/subscriber-list.js';
import { GooseList } from './subscription/goose/goose-list.js';
import { IedList } from './subscription/ied-list.js';

/** Defining view outside the class, which makes it persistent. */
let view: View = View.PUBLISHER;

/** An editor plugin for subscribing IEDs to GOOSE messages. */
export default class OscdEditorSubscriberMsgBinding extends ScopedElementsMixin(
  LitElement,
) {
  static scopedElements = {
    'oscd-radio': OscdRadio,
    'subscriber-list-goose': SubscriberListGoose,
    'goose-list': GooseList,
    'ied-list': IedList,
    'oscd-scl-dialogs': OscdSclDialogs,
  };

  @property({ attribute: false })
  doc!: XMLDocument;

  @property({ attribute: false })
  docVersion?: unknown;

  @query('#goosePublisherView')
  goosePublisherView!: HTMLElement;

  @query('#gooseSubscriberView')
  gooseSubscriberView!: HTMLElement;

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
      view = evt.detail.view;
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

  firstUpdated(): void {
    const target = (
      view == View.PUBLISHER
        ? this.goosePublisherView
        : this.gooseSubscriberView
    ) as HTMLElement & { checked: boolean };
    if (target) target.checked = true;
  }

  render(): TemplateResult {
    return html`<div>
      <label>
        <oscd-radio
          id="goosePublisherView"
          name="view"
          value="goose"
          @click=${() =>
            this.listDiv.dispatchEvent(newViewEvent(View.PUBLISHER))}
        ></oscd-radio>
        ${msg('Publisher | Subscriber')}
      </label>
      <label>
        <oscd-radio
          id="gooseSubscriberView"
          name="view"
          value="ied"
          @click=${() =>
            this.listDiv.dispatchEvent(newViewEvent(View.SUBSCRIBER))}
        ></oscd-radio>
        ${msg('Subscriber | Publisher')}
      </label>
      <div class="container">
        ${view == View.PUBLISHER
          ? html`<goose-list
              class="row"
              .docVersion=${this.docVersion}
              .doc=${this.doc}
            ></goose-list>`
          : html`<ied-list
              class="row"
              .docVersion=${this.docVersion}
              .doc=${this.doc}
              serviceType="goose"
            ></ied-list>`}
        <subscriber-list-goose
          class="row"
          .docVersion=${this.docVersion}
          .doc=${this.doc}
        ></subscriber-list-goose>
      </div>
      <oscd-scl-dialogs></oscd-scl-dialogs>
    </div>`;
  }

  static styles = css`
    :host {
      width: 100vw;
    }

    label {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      margin-right: 16px;
    }

    .container {
      display: flex;
      padding: 8px 6px 16px;
      height: 86vh;
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
