import { subscribe } from '@openscd/scl-lib';

import { getExtRef } from './subscription.js';

export function subscribeDataSetToIed(
  ied: Element,
  dataSet: Element,
  controlBlock: Element | undefined,
): ReturnType<typeof subscribe> {
  const ln0 = ied.querySelector('LN0');
  if (!ln0) {
    return [];
  }

  const inputs = ln0.querySelector(':scope > Inputs');
  const sink = inputs ?? ln0;
  const connections = Array.from(dataSet.querySelectorAll('FCDA'))
    .filter(fcda => !inputs || !getExtRef(inputs, fcda, controlBlock))
    .map(fcda => ({
      sink,
      source: { fcda, controlBlock },
    }));

  return connections.length > 0 ? subscribe(connections) : [];
}
