import { expect } from '@open-wc/testing';
import { isInsert } from '@openscd/oscd-api/utils.js';

import { subscribeDataSetToIed } from './subscription-edits.js';

const sclXml = `<?xml version="1.0" encoding="UTF-8"?>
<SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL">
  <IED name="Publisher">
    <AccessPoint name="AP">
      <Server>
        <LDevice inst="LD0">
          <LN0 lnClass="LLN0" inst="" lnType="LN0">
            <DataSet name="dataset">
              <FCDA ldInst="LD0" lnClass="MMXU" lnInst="1" doName="PhV" daName="phsA.cVal.mag.f" fc="MX" />
              <FCDA ldInst="LD0" lnClass="MMXU" lnInst="1" doName="A" daName="phsA.cVal.mag.f" fc="MX" />
            </DataSet>
            <GSEControl name="gcb" datSet="dataset" />
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="Subscriber">
    <AccessPoint name="AP">
      <Server>
        <LDevice inst="LD0">
          <LN0 lnClass="LLN0" inst="" lnType="LN0">SUBSCRIBER_INPUTS</LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
</SCL>`;

function createDocument(withExistingExtRef = false): XMLDocument {
  const inputs = withExistingExtRef
    ? `<Inputs>
        <ExtRef iedName="Publisher" ldInst="LD0" lnClass="MMXU" lnInst="1" doName="PhV" daName="phsA.cVal.mag.f" serviceType="GOOSE" srcLDInst="LD0" srcLNClass="LLN0" srcCBName="gcb" />
      </Inputs>`
    : '';
  return new DOMParser().parseFromString(
    sclXml.replace('SUBSCRIBER_INPUTS', inputs),
    'application/xml',
  );
}

function getSubscriptionInputs(doc: XMLDocument): Element {
  const inputs = doc.querySelector('IED[name="Subscriber"] LN0 > Inputs');
  if (!inputs) {
    throw new Error('Subscriber Inputs element was not found');
  }
  return inputs;
}

describe('subscribeDataSetToIed', () => {
  it('creates one Inputs element for all dataset ExtRefs', () => {
    const doc = createDocument();
    const subscriber = doc.querySelector('IED[name="Subscriber"]')!;
    const dataSet = doc.querySelector('DataSet[name="dataset"]')!;
    const controlBlock = doc.querySelector('GSEControl[name="gcb"]')!;

    const edits = subscribeDataSetToIed(subscriber, dataSet, controlBlock);
    const inserts = edits.filter(isInsert);
    const inputsInserts = inserts.filter(
      edit => edit.node.nodeName === 'Inputs',
    );

    expect(inputsInserts).to.have.length(1);

    const [inputsInsert] = inputsInserts;
    expect(inputsInsert.parent).to.equal(subscriber.querySelector('LN0'));    const extRefInserts = inserts.filter(
      edit => edit.node.nodeName === 'ExtRef',
    );

    expect(inputsInsert).to.exist;
    expect(extRefInserts).to.have.length(2);
    expect(extRefInserts.every(edit => edit.parent === inputsInsert?.node)).to
      .be.true;
  });

  it('adds only missing ExtRefs to the existing Inputs element', () => {
    const doc = createDocument(true);
    const subscriber = doc.querySelector('IED[name="Subscriber"]')!;
    const dataSet = doc.querySelector('DataSet[name="dataset"]')!;
    const controlBlock = doc.querySelector('GSEControl[name="gcb"]')!;
    const existingInputs = getSubscriptionInputs(doc);

    const edits = subscribeDataSetToIed(subscriber, dataSet, controlBlock);
    const inserts = edits.filter(isInsert);

    const extRefInserts = inserts.filter(
      edit => edit.node.nodeName === 'ExtRef',
    );

    expect(extRefInserts).to.have.length(1);

    const [extRefInsert] = extRefInserts;
    expect(extRefInsert.parent).to.equal(existingInputs);
    expect(extRefInsert.node.nodeName).to.equal('ExtRef');

    expect(extRefInsert.parent).to.equal(existingInputs);
    if (!(extRefInsert.node instanceof Element)) {
      throw new Error('Inserted ExtRef is not an element');
    }
    expect(extRefInsert.node.getAttribute('doName')).to.equal('A');
  });

  it('returns no edits when the IED has no LN0', () => {
    const doc = createDocument();
    const subscriber = doc.querySelector('IED[name="Subscriber"]')!;
    subscriber.querySelector('LN0')?.remove();

    expect(
      subscribeDataSetToIed(
        subscriber,
        doc.querySelector('DataSet')!,
        doc.querySelector('GSEControl')!,
      ),
    ).to.deep.equal([]);
  });
});
