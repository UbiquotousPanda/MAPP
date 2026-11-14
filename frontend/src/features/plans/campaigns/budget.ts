import type { components } from '@/api/generated/schema';
import { formatAmount, formatCents, parseMoneyInput, toCents } from '@/format/decimal';

type Money = components['schemas']['Money'];
type MoneyInput = components['schemas']['MoneyInput'];

/** Null when the parent has no budget; text that is not an amount counts as nothing. */
export function remainingWhileTyping(
  parentRemaining: Money | null,
  savedOwn: Money | null,
  typed: string,
): Money | null {
  if (!parentRemaining) {
    return null;
  }
  const typedCents = toCents(parseMoneyInput(typed)?.amount ?? '0');
  const savedCents = savedOwn ? toCents(savedOwn.amount) : 0n;
  return {
    amount: formatCents(toCents(parentRemaining.amount) + savedCents - typedCents),
    currency: parentRemaining.currency,
  };
}

export function isNegative(money: Money): boolean {
  return toCents(money.amount) < 0n;
}

export function withoutSign(money: Money): Money {
  return { amount: money.amount.replace(/^-/, ''), currency: money.currency };
}

/** Text that is not an amount is sent as typed, so the API reports it with every other problem. */
export function budgetInput(typed: string, currency: string): MoneyInput | null {
  const text = typed.trim();
  if (text === '') {
    return null;
  }
  return { amount: parseMoneyInput(text)?.amount ?? text, currency };
}

export function budgetText(budget: Money | null): string {
  return budget ? formatAmount(budget.amount) : '';
}
