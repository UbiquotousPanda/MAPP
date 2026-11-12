import type { components } from '@/api/generated/schema';
import {
  formatAmount,
  formatCents,
  formatMoneyText,
  parseMoneyInput,
  toCents,
} from '@/format/decimal';
import { formatMonth as formatMonthLabel } from '@/format/intl';
import type { DateFormat } from '@/format/intl';

export type SpreadMethod = components['schemas']['SpreadMethod'];
type Money = components['schemas']['Money'];

export interface ActivityDates {
  startDate: string | null;
  endDate: string | null;
  ongoing: boolean;
}

/** "12500", "12,500.00", "12.5k" in cents; more decimals round half-up (1,234.565 → 1,234.57). */
export function parseAmount(text: string): bigint | null {
  const parsed = parseMoneyInput(text);
  return parsed ? toCents(parsed.amount) : null;
}

export function amountText(value: bigint | string, code: string): string {
  const amount = typeof value === 'bigint' ? formatCents(value) : value;
  return formatMoneyText({ amount, currency: code });
}

export function moneyText(money: Money): string {
  return amountText(money.amount, money.currency);
}

export function centsInput(cents: bigint): string {
  return formatAmount(formatCents(cents));
}

export function formatMonth(month: string, format?: DateFormat): string {
  return formatMonthLabel(month, format);
}

export function addMonths(month: string, count: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + count;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function activityMonths(dates: ActivityDates): string[] {
  if (!dates.startDate) {
    return [];
  }
  const first = dates.startDate.slice(0, 7);
  if (dates.ongoing) {
    return [first];
  }
  if (!dates.endDate) {
    return [];
  }
  const last = dates.endDate.slice(0, 7);
  const months: string[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months;
}

export function isOutsideDates(month: string, dates: ActivityDates): boolean {
  if (activityMonths(dates).length === 0 || !dates.startDate) {
    return false;
  }
  if (month < dates.startDate.slice(0, 7)) {
    return true;
  }
  return !dates.ongoing && month > (dates.endDate ?? '').slice(0, 7);
}

export function customGridMonths(
  dates: ActivityDates,
  planYear: number,
  storedMonths: string[] = [],
): string[] {
  let months = activityMonths(dates);
  const first = months[0];
  if (first === undefined) {
    months = Array.from({ length: 12 }, (_, index) => addMonths(`${planYear}-01`, index));
  } else if (dates.ongoing) {
    const december = `${planYear}-12`;
    for (let month = addMonths(first, 1); month <= december; month = addMonths(month, 1)) {
      months.push(month);
    }
  }
  return [...new Set([...months, ...storedMonths])].sort();
}
