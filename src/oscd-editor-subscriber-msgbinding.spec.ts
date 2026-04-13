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
});
