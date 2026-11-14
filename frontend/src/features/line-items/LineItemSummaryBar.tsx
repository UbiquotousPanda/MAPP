import type { components } from '@/api/generated/schema';
import { FieldHelpTip } from '@/features/settings';
import { toCents } from '@/format/decimal';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { amountText, moneyText } from './line-item-math';
import { SUMMARY_NO_COST } from './line-item-text';

type UnassignedBalance = components['schemas']['UnassignedBalance'];
type Money = components['schemas']['Money'];

export interface LineItemSummaryBarProps {
  balance: UnassignedBalance;
  /** The unassigned planned cost after saving, worked out by the API; null while it can't be. */
  after: Money | null;
}

/** "Activity planned cost · Unassigned now · After saving" above the line-item form, red below zero. */
export function LineItemSummaryBar({ balance, after }: LineItemSummaryBarProps) {
  if (!balance.plannedCost || !balance.balance) {
    return (
      <StatStrip label="Activity summary">
        <p>{SUMMARY_NO_COST}</p>
      </StatStrip>
    );
  }
  const now = toCents(balance.balance.amount);
  const code = balance.balance.currency;
  return (
    <StatStrip label="Activity summary">
      <SummaryCard
        label="Activity planned cost"
        tip={<FieldHelpTip helpKey="activity.plannedCost" label="Activity planned cost" />}
        value={moneyText(balance.plannedCost)}
      />
      <SummaryCard
        label="Unassigned now"
        tip={<FieldHelpTip helpKey="activity.unassignedPlannedCost" label="Unassigned now" />}
        value={amountText(now, code)}
        tone={now < 0n ? 'problem' : undefined}
      />
      <SummaryCard
        label="After saving"
        value={after ? moneyText(after) : '—'}
        tone={after && toCents(after.amount) < 0n ? 'problem' : undefined}
      />
    </StatStrip>
  );
}
