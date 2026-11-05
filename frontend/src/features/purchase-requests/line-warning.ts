import { allowanceCents } from '@/features/overspend';
import { formatCents, parseMoneyInput, toCents } from '@/format/decimal';
import type { LineValues } from './form-schema';
import { overLeftText } from './form-text';

type WarnedLine = Pick<LineValues, 'amount' | 'currency' | 'left'> & { lineItem: { id: string } };

/**
 * The warning before saving a line that goes over what its line item has left but stays within Settings ›
 * Overspend control's tolerance of its amount, from the API's left and tolerance; beyond it the API refuses,
 * and a line in another currency than its line item's is left to the API, which converts at today's rates.
 */
export function overLeftWarning(line: WarnedLine, tolerancePercent: number | undefined) {
  const parsed = parseMoneyInput(line.amount.trim());
  if (
    !line.left ||
    !parsed ||
    tolerancePercent === undefined ||
    line.currency !== line.left.currency
  ) {
    return null;
  }
  const typed = toCents(parsed.amount);
  const left = toCents(line.left.amount);
  if (typed <= left || typed > left + allowanceCents(typed, tolerancePercent)) {
    return null;
  }
  const currency = line.left.currency;
  return overLeftText(
    { amount: formatCents(typed - left), currency },
    line.lineItem.id,
    { amount: formatCents(left < 0n ? 0n : left), currency },
    tolerancePercent,
  );
}
