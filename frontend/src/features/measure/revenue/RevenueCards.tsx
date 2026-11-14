import { useFormatters } from '@/format/useFormatters';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { reasonText } from './reasons';
import { varianceText } from './variance';
import type { RevenueCards as RevenueCardsData, RevenueReport } from './api';
import { projectionLine } from './projection-line';
import { modelsLine, projectedTip } from './projection-detail';

/** The fixed Revenue card set: goal, actual, projected, performance (049-C9). */
export function RevenueCards({
  cards,
  projections,
}: {
  cards: RevenueCardsData;
  projections: RevenueReport['projections'];
}) {
  const { money, moneyCompact, date } = useFormatters();
  const amount = (value: RevenueCardsData['goal']['value']) =>
    value ? { value: moneyCompact(value), fullValue: money(value) } : { value: '—' };
  return (
    <StatStrip label="Summary">
      <SummaryCard
        label="Revenue goal"
        {...amount(cards.goal.value)}
        detail={cards.goal.value ? undefined : why(cards.goal.reason)}
        tip="Each plan's model sets its stages, rates and velocity. A goal projects the later stages within the plan year, and this report compares actual and projected against it."
      />
      <SummaryCard
        label="Actual revenue"
        {...amount(cards.actual.value)}
        detail={cards.actual.value ? undefined : why(cards.actual.reason)}
        tip="Revenue facts matched to the activities in view, to today."
      />
      <SummaryCard
        label="Actual or projected"
        {...amount(cards.projected.value)}
        tip={projectedTip(projectionLine(projections, date))}
        detail={cards.projected.value ? modelsLine(projections) : why(cards.projected.reason)}
      />
      <SummaryCard
        label="Performance"
        value={cards.performance.value !== null ? `${cards.performance.value}%` : '—'}
        detail={varianceText(cards.performance.variance)}
        tip="Actual or projected ÷ goal."
      />
    </StatStrip>
  );
}

/** The reason under a "—" value, left out when it would only repeat the dash. */
function why(reason: Parameters<typeof reasonText>[0]): string | undefined {
  const text = reasonText(reason);
  return text === '—' ? undefined : text;
}
