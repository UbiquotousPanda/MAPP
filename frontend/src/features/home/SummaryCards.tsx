import { useCurrentUser } from '@/session/useSession';
import { ProgressBar } from '@/ui/ProgressBar/ProgressBar';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { cx } from '@/ui/cx';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { useHomeSummary } from './api';
import type { HomeScope, HomeSummary } from './api';
import {
  NOTHING_PLANNED,
  PLANS_CARD,
  activityCountsText,
  isZero,
  ofPlanBudgetText,
  oldestWaitingText,
  percentUsedText,
  ownedYearsText,
  planCountsText,
  plansWithoutBudgetText,
} from './home-text';
import { myActivitiesHref, plansListHref, waitingForMeHref } from './home-links';
import { SectionError } from './SectionError';
import styles from './SummaryCards.module.css';

export function SummaryCards({ scope }: { scope: HomeScope }) {
  const person = useCurrentUser();
  const { money, moneyCompact } = useFormatters();
  const summary = useHomeSummary(scope);

  if (summary.isPending) {
    return (
      <StatStrip label="Summary">
        {[1, 2, 3, 4].map((card) => (
          <div key={card}>
            <Skeleton lines={3} />
          </div>
        ))}
      </StatStrip>
    );
  }
  if (summary.isError) {
    return (
      <StatStrip label="Summary">
        <div>
          <SectionError onRetry={() => void summary.refetch()} />
        </div>
      </StatStrip>
    );
  }

  const { plans, activitiesOwned, waitingForMe, plannedCost } = summary.data;
  const plansCard = PLANS_CARD[scope];
  // Nothing planned is "—", never "$0.00" (design system §4.4, functional review X-08).
  const nothingPlanned = plannedCost.planCount === 0 || isZero(plannedCost.plannedCost);

  return (
    <StatStrip label="Summary">
      <SummaryCard
        label={plansCard.label}
        tip={plansCard.tip}
        value={formatWhole(plans.count)}
        detail={<span>{planCountsText(plans.published, plans.draft)}</span>}
        to={plansListHref(scope)}
        linkLabel="open the Plans list"
      />
      <SummaryCard
        label="Activities I own"
        tip="Activities you own, in the plans of these years."
        value={formatWhole(activitiesOwned.count)}
        detail={
          <span>
            {[
              ownedYearsText(activitiesOwned.yearFrom, activitiesOwned.yearTo),
              activityCountsText(activitiesOwned.declined, activitiesOwned.submitted),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        }
        to={myActivitiesHref(person.id, activitiesOwned.yearFrom, activitiesOwned.yearTo)}
        linkLabel="open your activities"
      />
      <SummaryCard
        label="Waiting for my approval"
        tip="Submitted activities waiting at a level where you are an approver."
        value={formatWhole(waitingForMe.count)}
        tone={waitingForMe.count > 0 ? 'review' : undefined}
        detail={<span>{oldestWaitingText(waitingForMe.oldestWaitingSince)}</span>}
        to={waitingForMeHref()}
        linkLabel="open Approvals"
      />
      <SummaryCard
        label="Planned cost vs plan budget"
        tip="Planned cost of the plans in scope compared with their plan budgets."
        value={nothingPlanned ? '—' : moneyCompact(plannedCost.plannedCost)}
        fullValue={nothingPlanned ? undefined : money(plannedCost.plannedCost)}
        detail={
          plannedCost.planCount === 0 ? (
            <span>No plans in scope</span>
          ) : (
            <BudgetUsed
              cost={plannedCost}
              budget={moneyCompact(plannedCost.planBudget)}
              nothingPlanned={nothingPlanned}
            />
          )
        }
        to={plansListHref(scope)}
        linkLabel="open the Plans list"
      />
    </StatStrip>
  );
}

interface BudgetUsedProps {
  cost: HomeSummary['plannedCost'];
  budget: string;
  nothingPlanned: boolean;
}

/**
 * Card 4's lines (FR-006): "of <budget> plan budget", the budget-used bar with "<n>% used" (red
 * above the budget) and "Includes <n> plans with no budget"; without any plan budget "No plan
 * budgets set" and "—"; with nothing planned yet "Nothing planned yet" instead of the bar.
 */
function BudgetUsed({ cost, budget, nothingPlanned }: BudgetUsedProps) {
  const used = cost.budgetUsedPercent;
  return (
    <>
      {nothingPlanned && <span>{NOTHING_PLANNED}</span>}
      <span>{cost.planBudget ? ofPlanBudgetText(budget) : 'No plan budgets set'}</span>
      {!nothingPlanned && (
        <span className={styles.usage}>
          <ProgressBar
            value={used}
            label="Budget used"
            tone={cost.overBudget ? 'problem' : undefined}
          />
          <span className={cx(styles.percent, cost.overBudget && styles.problem)}>
            {used === null ? '—' : percentUsedText(used)}
          </span>
        </span>
      )}
      {cost.planBudget && cost.plansWithoutBudget > 0 && (
        <span>{plansWithoutBudgetText(cost.plansWithoutBudget)}</span>
      )}
    </>
  );
}
