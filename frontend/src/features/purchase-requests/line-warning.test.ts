import { describe, expect, it } from 'vitest';
import { overLeftWarning } from './line-warning';

const lineItem = { id: 'L-1005' };
const rates = new Map([
  ['USD', '1'],
  ['EUR', '0.8'],
]);

function line(amount: string, currency = 'USD') {
  return { amount, currency, lineItem, left: { amount: '19000.01', currency: 'USD' } };
}

describe('overLeftWarning (demo-mvp #4)', () => {
  it('warns before saving a line over what its line item has left, within the tolerance of its amount', () => {
    expect(overLeftWarning(line('21,111.12'), 10)).toBe(
      'This request goes 2,111.11 USD over what line item L-1005 has left (19,000.01 USD); allowed up to 10% over.',
    );
  });

  it('says nothing within what is left, beyond the tolerance (the API refuses), or without a tolerance', () => {
    expect(overLeftWarning(line('19000.01'), 10)).toBeNull();
    expect(overLeftWarning(line('21111.13'), 10)).toBeNull();
    expect(overLeftWarning(line('20000.00'), undefined)).toBeNull();
    expect(overLeftWarning(line('19000.02'), 0)).toBeNull();
  });

  it('converts a line in another currency into its line item’s at the current rates', () => {
    expect(overLeftWarning(line('16000.00', 'EUR'), 10, rates)).toBe(
      'This request goes 999.99 USD over what line item L-1005 has left (19,000.01 USD); allowed up to 10% over.',
    );
    expect(overLeftWarning(line('15200.00', 'EUR'), 10, rates)).toBeNull();
    expect(overLeftWarning(line('18000.00', 'EUR'), 10, rates)).toBeNull();
  });

  it('says nothing for another currency until the rates are known', () => {
    expect(overLeftWarning(line('16000.00', 'EUR'), 10)).toBeNull();
  });
});
