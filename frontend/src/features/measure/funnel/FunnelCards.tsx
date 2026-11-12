import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { useFormatters } from '@/format/useFormatters';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { varianceText } from '../revenue/variance';
import { reasonText } from './reasons';
import type { FunnelCards as FunnelCardsData, FunnelReport } from '../revenue/api';
import { projectionLine } from '../revenue/projection-line';
import { modelsLine, projectedTip } from '../revenue/projection-detail';
import { stageName } from './stage-words';

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
  const whole = (value: number | null) =>
    value === null ? null : Math.round(value).toLocaleString();
  return (
    <StatStrip label={`Summary: ${stageName(stage)}`}>
      <SummaryCard
        label="Goal"
        value={whole(cards.goal.value) ?? '—'}
        detail={whole(cards.goal.value) ? undefined : why(cards.goal.reason)}
      />
      <SummaryCard
        label="Actual"
        value={whole(cards.actual.value) ?? '—'}
        detail={whole(cards.actual.value) ? undefined : why(cards.actual.reason)}
        tip="Facts matched to the activities in view, to today."
      />
      <SummaryCard
        label="Actual or projected"
        value={whole(cards.projected.value) ?? '—'}
        tip={projectedTip(projectionLine(projections, date))}
        detail={
          whole(cards.projected.value) ? modelsLine(projections) : why(cards.projected.reason)
        }
      />
      <SummaryCard
        label="Performance"
        value={cards.performance.value !== null ? `${cards.performance.value}%` : '—'}
        detail={varianceText(cards.performance.variance)}
      />
      <SummaryCard
        label="Conversion"
        value={cards.conversion.value !== null ? `${cards.conversion.value}%` : '—'}
        detail={cards.conversion.value !== null ? undefined : why(cards.conversion.reason)}
        tip="This stage's actual over the previous stage's actual."
      />
    </StatStrip>
  );
}

/** The reason under a "—" value, left out when it would only repeat the dash. */
function why(reason: Parameters<typeof reasonText>[0]): string | undefined {
  const text = reasonText(reason);
  return text === '—' ? undefined : text;
}
