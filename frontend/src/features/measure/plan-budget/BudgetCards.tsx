import { useFormatters } from '@/format/useFormatters';
import { cx } from '@/ui/cx';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { TooltipText } from '@/ui/Tooltip/TooltipText';
import type { PlanBudgetCards } from './api';
import styles from './PlanBudget.module.css';

const NONE = '—';

type Amount = PlanBudgetCards['budget'];

/** Five headline figures, each of 040's other five under the one it follows from; "—" for none or hidden. */
export function BudgetCards({ cards }: { cards: PlanBudgetCards }) {
  const { money, moneyCompact } = useFormatters();
  const amount = (value: Amount) =>
    value ? { value: moneyCompact(value), fullValue: money(value) } : { value: NONE };
  const short = (value: Amount) => (value ? moneyCompact(value) : NONE);
  const percent = (value: number | null) => (value === null ? NONE : `${value}%`);
  const overAllocated = cards.leftToPlan !== null && cards.leftToPlan.amount.startsWith('-');
  return (
    <StatStrip label="Summary">
      <SummaryCard label="Budget" {...amount(cards.budget)} tip="Counted once per branch." />
      <SummaryCard
        label="Planned cost"
        {...amount(cards.planned)}
        tip="Left to plan: budget − planned cost; below zero, more is planned than budgeted."
        detail={
          <>
            <Pair
              label="Left to plan"
              value={short(cards.leftToPlan)}
              full={cards.leftToPlan && money(cards.leftToPlan)}
              danger={overAllocated}
            />
            {overAllocated && <StatusChip tone="problem">Over-allocated</StatusChip>}
          </>
        }
      />
      <SummaryCard
        label="Committed"
        {...amount(cards.committed)}
        tip="Purchase-order lines of the year. % committed: committed ÷ planned cost."
        detail={
          <>
            <Pair
              label="Not yet committed"
              value={short(cards.notYetCommitted)}
              full={cards.notYetCommitted && money(cards.notYetCommitted)}
            />
            <Pair label="% committed" value={percent(cards.committedShare)} />
          </>
        }
      />
      <SummaryCard
        label="Actual"
        {...amount(cards.actual)}
        tip="Payments posted in the year. Unspent: budget − actual; spent: actual ÷ budget."
        detail={
          <>
            <Pair
              label="Unspent budget"
              value={short(cards.unspent)}
              full={cards.unspent && money(cards.unspent)}
            />
            <Pair label="Budget spent" value={percent(cards.budgetSpent)} />
          </>
        }
      />
      <SummaryCard
        label="Budget used"
        value={percent(cards.budgetUsed)}
        tip="Planned cost ÷ budget."
      />
    </StatStrip>
  );
}

interface PairProps {
  label: string;
  value: string;
  full?: string | null;
  danger?: boolean;
}

function Pair({ label, value, full, danger = false }: PairProps) {
  return (
    <span className={styles.pair}>
      <span>{label}</span>
      <span className={cx(styles.pairValue, danger && styles.danger)}>
        {full && full !== value ? (
          <TooltipText tip={full}>
            {value}
            <span className="visually-hidden"> ({full})</span>
          </TooltipText>
        ) : (
          value
        )}
      </span>
    </span>
  );
}
