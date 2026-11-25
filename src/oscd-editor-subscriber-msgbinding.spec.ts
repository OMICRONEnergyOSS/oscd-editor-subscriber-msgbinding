import { expect, fixture, html } from '@open-wc/testing';
import OscdEditorSubscriberMsgBinding from './oscd-editor-subscriber-msgbinding.js';

customElements.define(
  'oscd-editor-subscriber-msgbinding',
  OscdEditorSubscriberMsgBinding,
);

const sclXmlDocString = `<?xml version="1.0" encoding="UTF-8"?><SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:ens1="http://example.org/somePreexistingExtensionNamespace">
  <Substation ens1:foo="a" name="A1" desc="test substation"></Substation>
</SCL>`;

describe('oscd-editor-subscriber-msgbinding', () => {
  let plugin: OscdEditorSubscriberMsgBinding;

  beforeEach(async () => {
    const sclDoc = new DOMParser().parseFromString(
      sclXmlDocString,
      'application/xml',
    );
    plugin = await fixture(
      html`<oscd-editor-subscriber-msgbinding></oscd-editor-subscriber-msgbinding>`,
    );
    plugin.doc = sclDoc;
  });

  afterEach(() => {
    plugin.remove();
  });

  it('tests that the plugin works as expected', async () => {
    // Add your assertions here
    expect(plugin.doc).to.exist;
  });

  it('uses the host MD3 roles for the editor canvas and selected buttons', async () => {
    plugin.style.setProperty('--md-sys-color-surface', 'rgb(12, 34, 56)');
    plugin.style.setProperty('--md-sys-color-primary', 'rgb(78, 90, 123)');
    plugin.style.setProperty('--md-sys-color-on-primary', 'rgb(234, 210, 198)');
    await plugin.updateComplete;

    const header = plugin.shadowRoot?.querySelector('.header');
    const container = plugin.shadowRoot?.querySelector('.container');
    const leftColumn = plugin.shadowRoot?.querySelector('.left-column');
    const button = plugin.shadowRoot?.querySelector(
      'oscd-outlined-segmented-button',
    );
    if (!header || !container || !leftColumn || !button) {
      throw new Error('Editor theme test elements are missing');
    }

    for (const element of [header, container, leftColumn]) {
      expect(getComputedStyle(element).backgroundColor).to.equal(
        'rgb(12, 34, 56)',
      );
    }
    const buttonStyle = getComputedStyle(button);
    expect(
      buttonStyle.getPropertyValue(
        '--md-outlined-segmented-button-selected-container-color',
      ).trim(),
    ).to.equal('rgb(78, 90, 123)');
    expect(
      buttonStyle.getPropertyValue(
        '--md-outlined-segmented-button-selected-label-text-color',
      ).trim(),
    ).to.equal('rgb(234, 210, 198)');
  });

  it('only scrolls the columns when their contents overflow', async () => {
    plugin.style.height = '300px';
    await plugin.updateComplete;

    const root = plugin.shadowRoot;
    const columns = root?.querySelectorAll<HTMLElement>('.row');
    if (!root || !columns || columns.length !== 2) {
      throw new Error('Editor columns are missing');
    }

    for (const column of columns) {
      expect(getComputedStyle(column).overflowY).to.equal('auto');
    }

    const column = document.createElement('div');
    column.className = 'row';
    column.style.height = '100px';
    root.append(column);
    expect(column.scrollHeight).to.equal(column.clientHeight);

    const overflowingContent = document.createElement('div');
    overflowingContent.style.height = '1000px';
    column.append(overflowingContent);
    expect(column.scrollHeight).to.be.greaterThan(column.clientHeight);
    column.scrollTop = 100;
    expect(column.scrollTop).to.equal(100);
    column.remove();
  });
});
