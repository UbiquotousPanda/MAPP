import type { components } from '@/api/generated/schema';
import { FieldHelpTip } from '@/features/settings';
import { toCents } from '@/format/decimal';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { amountText, moneyText } from './line-item-math';
import { SUMMARY_NO_COST } from './line-item-text';

type UnassignedBalance = components['schemas']['UnassignedBalance'];

export interface LineItemSummaryBarProps {
  balance: UnassignedBalance;
  /** What saving changes in the assigned amount, in cents of the balance's currency. */
  change: bigint;
}

/** "Activity planned cost · Unassigned now · After saving" above the line-item form, red below zero. */
export function LineItemSummaryBar({ balance, change }: LineItemSummaryBarProps) {
  if (!balance.plannedCost || !balance.balance) {
    return (
      <StatStrip label="Activity summary">
        <p>{SUMMARY_NO_COST}</p>
      </StatStrip>
    );
  }
  const now = toCents(balance.balance.amount);
  const after = now - change;
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
        value={amountText(after, code)}
        tone={after < 0n ? 'problem' : undefined}
      />
    </StatStrip>
  );
}
