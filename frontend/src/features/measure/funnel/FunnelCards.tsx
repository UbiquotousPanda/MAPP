import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { useFormatters } from '@/format/useFormatters';
import { SeriesCard } from '../shared';
import { varianceText } from '../revenue/variance';
import { reasonText } from './reasons';
import type { FunnelCards as FunnelCardsData, FunnelReport } from '../revenue/api';
import { projectionLine } from '../revenue/projection-line';
import styles from './Funnel.module.css';

const STAGE_WORDS: Record<string, string> = { inq: 'INQ', mql: 'MQL' };

/** The fixed Funnel card set for one stage: goal, actual, projected, performance, conversion (049-C9). */
export function FunnelCards({
  stage,
  cards,
  projections,
}: {
  stage: string;
  cards: FunnelCardsData;
  projections: FunnelReport['projections'];
}) {
  const { date } = useFormatters();
  const name = STAGE_WORDS[stage] ?? stage;
  const whole = (value: number | null) =>
    value === null ? null : Math.round(value).toLocaleString();
  return (
    <div className={styles.cards} aria-label="Summary">
      <SeriesCard
        series="goal"
        label={`${name} goal`}
        value={whole(cards.goal.value) ?? reasonText(cards.goal.reason)}
      />
      <SeriesCard
        series="actual"
        label={`${name} actual`}
        value={whole(cards.actual.value) ?? reasonText(cards.actual.reason)}
        tip="Facts matched to the activities in view, to today."
      />
      <SeriesCard
        series="projected"
        label={`${name} actual or projected`}
        value={whole(cards.projected.value) ?? reasonText(cards.projected.reason)}
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
      />
      <SummaryCard
        label="Conversion"
        value={
          cards.conversion.value !== null
            ? `${cards.conversion.value}%`
            : reasonText(cards.conversion.reason)
        }
        tip="This stage's actual over the previous stage's actual."
      />
    </div>
  );
}
