import { allowanceCents } from '@/features/overspend';
import { formatCents, parseMoneyInput, toCents } from '@/format/decimal';
import type { LineValues } from './form-schema';
import { overLeftText } from './form-text';

type WarnedLine = Pick<LineValues, 'amount' | 'currency' | 'left'> & { lineItem: { id: string } };

/** Units per 1 USD by currency code, from the current rates. */
export type RatesPerUsd = ReadonlyMap<string, string>;

/** Beyond the tolerance the API refuses, so only a line over what is left but within it is warned. */
export function overLeftWarning(
  line: WarnedLine,
  tolerancePercent: number | undefined,
  rates: RatesPerUsd = new Map(),
) {
  const parsed = parseMoneyInput(line.amount.trim());
  if (!line.left || !parsed || tolerancePercent === undefined) {
    return null;
  }
  const currency = line.left.currency;
  const typed = inCurrency(toCents(parsed.amount), line.currency, currency, rates);
  if (typed === null) {
    return null;
  }
  const left = toCents(line.left.amount);
  if (typed <= left || typed > left + allowanceCents(typed, tolerancePercent)) {
    return null;
  }
  return overLeftText(
    { amount: formatCents(typed - left), currency },
    line.lineItem.id,
    { amount: formatCents(left < 0n ? 0n : left), currency },
    tolerancePercent,
  );
}

function inCurrency(cents: bigint, from: string, to: string, rates: RatesPerUsd): bigint | null {
  if (from === to) {
    return cents;
  }
  const fromRate = rates.get(from);
  const toRate = rates.get(to);
  if (!fromRate || !toRate) {
    return null;
  }
  const divisor = micros(fromRate);
  return (cents * micros(toRate) * 2n + divisor) / (divisor * 2n);
}

function micros(rate: string): bigint {
  const [whole, fraction = ''] = rate.trim().split('.');
  return BigInt(whole || '0') * 1_000_000n + BigInt(fraction.slice(0, 6).padEnd(6, '0'));
}
