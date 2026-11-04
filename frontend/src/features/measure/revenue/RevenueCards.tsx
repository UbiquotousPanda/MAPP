import { useFormatters } from '@/format/useFormatters';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { SeriesCard } from '../shared';
import { reasonText } from './reasons';
import { varianceText } from './variance';
import type { RevenueCards as RevenueCardsData, RevenueReport } from './api';
import { projectionLine } from './projection-line';
import styles from './Revenue.module.css';

/** The fixed Revenue card set: goal, actual, projected, performance (049-C9). */
export function RevenueCards({
  cards,
  projections,
}: {
  cards: RevenueCardsData;
  projections: RevenueReport['projections'];
}) {
  const { money, date } = useFormatters();
  return (
    <div className={styles.cards} aria-label="Summary">
      <SeriesCard
        series="goal"
        label="Revenue goal"
        value={cards.goal.value ? money(cards.goal.value) : reasonText(cards.goal.reason)}
        tip="Each plan's model sets its stages, rates and velocity. A goal projects the later stages within the plan year, and this report compares actual and projected against it."
      />
      <SeriesCard
        series="actual"
        label="Actual revenue"
        value={cards.actual.value ? money(cards.actual.value) : reasonText(cards.actual.reason)}
        tip="Revenue facts matched to the activities in view, to today."
      />
      <SeriesCard
        series="projected"
        label="Actual or projected"
        value={
          cards.projected.value ? money(cards.projected.value) : reasonText(cards.projected.reason)
        }
        tip="Actual to the end of last period, projected from today."
        detail={projectionLine(projections, date)}
      />
      <SummaryCard
        label="Performance"
        value={
          cards.performance.value !== null
            ? `${cards.performance.value}%`
            : varianceText(cards.performance.variance)
        }
        detail={cards.performance.value !== null && varianceText(cards.performance.variance)}
        tip="Actual or projected ÷ goal."
      />
    </div>
  );
}
