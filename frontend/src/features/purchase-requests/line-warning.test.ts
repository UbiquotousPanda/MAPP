import { describe, expect, it } from 'vitest';
import { overLeftWarning } from './line-warning';

const lineItem = { id: 'L-1005' };

function line(amount: string, currency = 'USD') {
  return { amount, currency, lineItem, left: { amount: '19000.01', currency: 'USD' } };
}

describe('overLeftWarning (demo-mvp #4)', () => {
  it('warns before saving a line over what its line item has left, within the tolerance of its amount', () => {
    expect(overLeftWarning(line('21,111.12'), 10)).toBe(
      'This request goes 2,111.11 USD over what line item L-1005 has left (19,000.01 USD); allowed up to 10% over.',
    );
  });

  it('says nothing within what is left, beyond the tolerance (the API refuses), or in another currency', () => {
    expect(overLeftWarning(line('19000.01'), 10)).toBeNull();
    expect(overLeftWarning(line('21111.13'), 10)).toBeNull();
    expect(overLeftWarning(line('20000.00', 'EUR'), 10)).toBeNull();
    expect(overLeftWarning(line('20000.00'), undefined)).toBeNull();
    expect(overLeftWarning(line('19000.02'), 0)).toBeNull();
  });
});
