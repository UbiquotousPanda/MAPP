import { formatCents, parseMoneyInput, toCents } from '@/format/decimal';
import type { Money, OverspendLimit, OverspendMode } from './api';
import {
  alreadyOverText,
  budgetBelowPlannedText,
  leftToPlanText,
  overBudgetText,
  overLimitText,
  takesOverText,
} from './overspend-text';

export interface BudgetCheckInput {
  mode: OverspendMode;
  typed: string;
  stored: string | null;
  planned: Money | null;
  /** Settings › Overspend control's tolerance; while it is unknown only the API refuses. */
  tolerancePercent?: number;
}

export interface BudgetCheck {
  error: string | null;
  note: string | null;
}

const NOTHING: BudgetCheck = { error: null, note: null };

function centsOf(text: string): bigint | null {
  const parsed = parseMoneyInput(text.trim());
  return parsed ? toCents(parsed.amount) : null;
}

/** tolerancePercent of cents, rounded down to the cent, as the API counts it. */
export function allowanceCents(cents: bigint, tolerancePercent: number): bigint {
  return (cents * BigInt(tolerancePercent)) / 100n;
}

/**
 * A budget typed below its planned cost: a warning before saving under Warn, or under Refuse
 * within the tolerance; beyond it, a Refuse budget is refused when lowered or newly set and noted when kept.
 */
export function budgetCheck({
  mode,
  typed,
  stored,
  planned,
  tolerancePercent,
}: BudgetCheckInput): BudgetCheck {
  const typedCents = centsOf(typed);
  if (!planned || typedCents === null) {
    return NOTHING;
  }
  const plannedCents = toCents(planned.amount);
  if (typedCents >= plannedCents) {
    return NOTHING;
  }
  const over = { amount: formatCents(plannedCents - typedCents), currency: planned.currency };
  const warning = takesOverText(over, {
    amount: formatCents(typedCents),
    currency: planned.currency,
  });
  const withinTolerance =
    tolerancePercent === undefined ||
    plannedCents <= typedCents + allowanceCents(typedCents, tolerancePercent);
  if (mode !== 'refuse' || withinTolerance) {
    return { error: null, note: warning };
  }
  if (stored === null || typedCents < toCents(stored)) {
    return { error: budgetBelowPlannedText(planned), note: null };
  }
  return { error: null, note: alreadyOverText(over) };
}

function increaseOf(before: string | null, typed: string): bigint | null {
  const typedCents = centsOf(typed);
  return typedCents === null ? null : typedCents - (before === null ? 0n : toCents(before));
}

function refuses(limit: OverspendLimit, increase: bigint): boolean {
  return limit.mode === 'refuse' && increase > toCents(limit.leftBeforeRefusing.amount);
}

/** What a typed planned cost would take beyond the tolerance of each Refuse budget above the activity: refused. */
export function overLimitMessages(
  limits: OverspendLimit[],
  before: string | null,
  typed: string,
): string[] {
  const increase = increaseOf(before, typed);
  if (increase === null || increase <= 0n) {
    return [];
  }
  return limits
    .filter((limit) => refuses(limit, increase))
    .map((limit) => {
      const over = increase - toCents(limit.leftToPlan.amount);
      return overLimitText(
        { amount: formatCents(over), currency: limit.leftToPlan.currency },
        limit.budget.type,
        limit.budget.name,
      );
    });
}

/**
 * What a typed planned cost would take over a budget above the activity without being refused: a Warn budget, or
 * a Refuse budget within the tolerance. Shown before saving; the save goes ahead.
 */
export function overBudgetWarnings(
  limits: OverspendLimit[],
  before: string | null,
  typed: string,
): string[] {
  const increase = increaseOf(before, typed);
  if (increase === null || increase <= 0n) {
    return [];
  }
  return limits
    .filter((limit) => increase > toCents(limit.leftToPlan.amount) && !refuses(limit, increase))
    .map((limit) => {
      const over = increase - toCents(limit.leftToPlan.amount);
      return overBudgetText(
        { amount: formatCents(over), currency: limit.leftToPlan.currency },
        limit.budget.type,
        limit.budget.name,
        limit.amount,
      );
    });
}

/** The note under an activity's planned cost: what is left in each Refuse budget above it. */
export function limitNotes(limits: OverspendLimit[]): string[] {
  return limits
    .filter((limit) => limit.mode === 'refuse')
    .map((limit) => leftToPlanText(limit.leftToPlan, limit.budget.type, limit.budget.name));
}
