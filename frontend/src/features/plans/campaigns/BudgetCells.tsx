import type { components } from '@/api/generated/schema';
import { formatMoneyText } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { ConvertedAmount } from '@/features/line-items';
import { differentCurrency } from '../plan-currency';
import { isNegative, withoutSign } from './budget';
import styles from './BudgetCost.module.css';
import type { Campaign } from './api';
import { overAllocatedBy, overBy, percentOfBudget, remainingText } from './texts';

type Money = components['schemas']['Money'];

export function BudgetCell({
  budget,
  displayBudget,
  remaining,
}: {
  budget: Money | null;
  displayBudget?: Money | null;
  remaining: Money | null;
}) {
  const { money: symbolForm } = useFormatters();
  if (!budget) {
    return <span>—</span>;
  }
  // Two currencies in the cell: every amount in it uses the code form (design system §4.4).
  const money = (value: Money) =>
    differentCurrency(budget, displayBudget) ? formatMoneyText(value) : symbolForm(value);
  return (
    <span className={styles.cell}>
      <ConvertedAmount primary={budget} secondary={displayBudget} />
      {remaining &&
        (isNegative(remaining) ? (
          // "Over by …" on screen keeps the column narrow; screen readers hear the whole word.
          <span className={styles.negativeDetail}>
            <span aria-hidden="true">{overBy(money(withoutSign(remaining)))}</span>
            <span className="visually-hidden">
              {overAllocatedBy(money(withoutSign(remaining)))}
            </span>
          </span>
        ) : (
          <span className={styles.detail}>{remainingText(money(remaining))}</span>
        ))}
    </span>
  );
}

export function CampaignBudgetCell({ campaign }: { campaign: Campaign }) {
  return (
    <BudgetCell
      budget={campaign.budget}
      displayBudget={campaign.display.budget}
      remaining={campaign.budgetAndCost.remainingForChildren}
    />
  );
}

// The share of the budget sits in this cell, not its own column, so the tree fits 1,440 px.
export function PlannedCostCell({
  cost,
  displayCost,
  percent,
  overBudget,
}: {
  cost: Money | null;
  displayCost?: Money | null;
  percent: number | null;
  overBudget: boolean;
}) {
  return (
    <span className={styles.cell}>
      <ConvertedAmount primary={cost} secondary={displayCost} />
      {percent !== null && (
        <span className={overBudget ? styles.negativeDetail : styles.detail}>
          {percentOfBudget(percent)}
        </span>
      )}
    </span>
  );
}
