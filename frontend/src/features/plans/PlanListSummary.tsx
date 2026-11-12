import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { useFormatters } from '@/format/useFormatters';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import styles from './PlansPage.module.css';
import type { PlanList } from './api';

/** The Plans list's summary cards: the plans, their total budget and planned cost (FR-001). */
export function PlanListSummary({ summary }: { summary: PlanList['summary'] | undefined }) {
  const { money, moneyCompact } = useFormatters();
  return (
    <StatStrip label="Summary">
      {summary ? (
        <>
          <SummaryCard
            label="Plans"
            value={summary.plans}
            tip="Plans in the chosen years, plan types and teams."
          />
          <SummaryCard
            label="Total plan budget"
            value={moneyCompact(summary.budget)}
            fullValue={money(summary.budget)}
            tip="The plan budgets of these plans added up. Plans without a budget add nothing."
          />
          <SummaryCard
            label="Total planned cost"
            value={moneyCompact(summary.plannedCost)}
            fullValue={money(summary.plannedCost)}
            tip="The planned cost of these plans added up: the sum of their activities' planned cost."
          />
        </>
      ) : (
        [0, 1, 2].map((card) => (
          <div key={card} className={styles.skeletonCard}>
            <Skeleton width="60%" />
            <Skeleton height="24px" width="40%" />
          </div>
        ))
      )}
    </StatStrip>
  );
}
