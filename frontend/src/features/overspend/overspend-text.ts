import { formatMoneyText } from '@/format/decimal';
import type { Money, OverspendApprovalMode, OverspendMode } from './api';

export const OVERSPEND_LABEL = 'When planned cost goes over this budget';
export const REFUSES_OVERSPENDING = 'Refuses overspending';
export const OVERSPEND_CONTROL = 'Overspend control';
export const DEFAULT_LABEL = 'New budgets start with';
export const SETTINGS_DESCRIPTION =
  'Whether a new budget warns or refuses when the planned cost under it goes over it.';
export const EXISTING_KEEP = 'Existing budgets keep their own setting.';
export const SETTING_SAVED = 'Overspend control saved.';
export const SAVE = 'Save';

export const MODES: readonly OverspendMode[] = ['warn', 'refuse'];

export const MODE_WORDS: Record<OverspendMode, string> = { warn: 'Warn', refuse: 'Refuse' };

export const MODE_HINTS: Record<OverspendMode, string> = {
  warn: 'Save and show the overage',
  refuse: 'Refuse any save that takes the planned cost over the budget',
};

/** A mode's hint on a budget form, with the tolerance in use once Settings › Overspend control has loaded. */
export function modeHint(mode: OverspendMode, tolerancePercent: number | undefined): string {
  if (tolerancePercent === undefined || tolerancePercent === 0) {
    return MODE_HINTS[mode];
  }
  return mode === 'refuse'
    ? `Refuse any save that takes the planned cost more than ${tolerancePercent}% over the budget; up to ${tolerancePercent}% over, only warn`
    : `${MODE_HINTS.warn}; Refuse would allow up to ${tolerancePercent}% over`;
}

const LEVEL_WORDS: Record<string, string> = {
  plan: 'plan',
  campaign: 'campaign',
  initiative: 'initiative',
  globalBudget: 'global budget',
};

export const APPROVAL_LABEL =
  "When an activity's line items exceed its planned cost, approving it or its purchase requests";

export const APPROVAL_MODES: readonly OverspendApprovalMode[] = ['warn', 'refuse'];

export const APPROVAL_WORDS: Record<OverspendApprovalMode, string> = {
  warn: 'Warn the approver',
  refuse: 'Refuse approval',
};

export const APPROVAL_HINTS: Record<OverspendApprovalMode, string> = {
  warn: 'Show each such activity and its overage before approving',
  refuse: 'Refuse approval until the line items are back within the planned cost; Decline stays',
};

export const TOLERANCE_BEFORE = 'Allow up to';
export const TOLERANCE_AFTER = '% over before refusing';
export const TOLERANCE_HINT =
  'Within it a budget set to Refuse only warns, and a purchase request may go over what its line item has left by this per cent of its amount.';
export const TOLERANCE_PROBLEM = 'Enter a whole per cent from 0 to 100.';

/** A whole per cent from 0 to 100 typed in the tolerance field; null for anything else. */
export function parseTolerance(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return value <= 100 ? value : null;
}

export const NEVER_CHANGED = 'Not changed since SP&A One was set up';

export function levelWord(type: string): string {
  return LEVEL_WORDS[type] ?? type;
}

export function budgetBelowPlannedText(planned: Money): string {
  return `The planned cost is ${formatMoneyText(planned)}; this budget refuses overspending, so it can't be lower than that.`;
}

export function alreadyOverText(over: Money): string {
  return `The planned cost is already over this budget by ${formatMoneyText(over)}. Anything that adds cost will be refused until it is back within the budget.`;
}

export function overLimitText(over: Money, type: string, name: string): string {
  return `This is ${formatMoneyText(over)} over the budget of ${levelWord(type)} '${name}', which refuses overspending.`;
}

/** The warning before saving a budget below its planned cost. */
export function takesOverText(over: Money, budget: Money): string {
  return `This takes the planned cost ${formatMoneyText(over)} over its budget of ${formatMoneyText(budget)}.`;
}

/** The warning before saving a planned cost that goes over a budget above the activity. */
export function overBudgetText(over: Money, type: string, name: string, budget: Money): string {
  return `This takes ${levelWord(type)} '${name}' ${formatMoneyText(over)} over its budget of ${formatMoneyText(budget)}.`;
}

export function leftToPlanText(left: Money, type: string, name: string): string {
  return `${formatMoneyText(left)} left to plan in ${levelWord(type)} '${name}', which refuses overspending.`;
}

export function lastChangedText(name: string, date: string): string {
  return `Last changed by ${name} on ${date}.`;
}
