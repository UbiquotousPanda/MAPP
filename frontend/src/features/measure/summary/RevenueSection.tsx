import type { ReactNode } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import {
  goalAfterYearText,
  moneyPoint,
  moneyUnit,
  ReportChart,
  ReportWidget,
  shortPeriod,
} from '../shared';
import type { ReportChartData, ReportTableData } from '../shared';
import type { RevenueSectionData, SummaryTrendPeriod } from './api';
import { varianceText } from '../revenue/variance';
import { STAGE, percentText } from './words';
import styles from './Summary.module.css';
import { PeriodSwitch } from '../shared';

type Money = NonNullable<SummaryTrendPeriod['actual']>;

const COVERAGE_TIP =
  "The activities' goals ÷ the plans' goals per stage: how much of each plan's goal is planned in activities. It is not performance.";

/** Revenue against goal: the fixed cards, how much of the goals activities plan, and the trend split at today. */
interface RevenueSectionProps {
  revenue: RevenueSectionData;
  notes?: ReactNode;
  details?: ReactNode;
}

export function RevenueSection({ revenue, notes, details }: RevenueSectionProps) {
  const { money } = useFormatters();
  const coverage = revenue.goalCoverage
    .map((c) => `${STAGE[c.stage]} ${percentText(c.percent)}`)
    .join(' · ');
  return (
    <section className={styles.section} aria-labelledby="summary-revenue">
      <div className={styles.sectionHead}>
        <h2 id="summary-revenue" className={styles.heading}>
          Revenue
        </h2>
        {details}
      </div>
      {notes}
      <StatStrip label="Revenue figures">
        <SummaryCard
          label="Actual or projected"
          value={revenue.actualOrProjected ? money(revenue.actualOrProjected) : '—'}
          tip="Actual to the end of the last month, projected from the month in progress on."
        />
        <SummaryCard
          label="Revenue goal"
          value={revenue.goal ? money(revenue.goal) : '—'}
          tip="The sum of the goals of the activities in view."
        />
        <SummaryCard
          label="Performance"
          value={percentText(revenue.performance)}
          detail={varianceText(revenue.variance)}
          tip="Actual or projected ÷ goal, as a whole per cent."
        />
      </StatStrip>
      <p className={styles.coverage}>
        <span className={styles.coverageLabel}>Goals planned in activities</span>
        <span>{coverage}</span>
        <InfoTip label="Goals planned in activities" text={COVERAGE_TIP} />
      </p>
      <TrendWidget trend={revenue.trend} totals={revenue.trendTotals} />
    </section>
  );
}

interface TrendWidgetProps {
  trend: SummaryTrendPeriod[];
  totals: RevenueSectionData['trendTotals'];
}

function TrendWidget({ trend, totals }: TrendWidgetProps) {
  const { money } = useFormatters();
  const amount = (value: SummaryTrendPeriod['actual']) => (value ? money(value) : '—');
  const today = trend.find((p) => p.state === 'inProgress');
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      ...['Actual', 'Projected', 'Goal'].map((label) => ({ label, numeric: true })),
    ],
    rows: trend.map((p) => ({
      key: p.key,
      cells: [p.label, amount(p.actual), amount(p.projected), amount(p.goal)],
    })),
    total: trend.length
      ? ['Total', amount(totals.actual), amount(totals.projected), amount(totals.goal)]
      : undefined,
  };
  return (
    <ReportWidget
      wide
      report="summary"
      widget="trend"
      controls={<PeriodSwitch />}
      title="Revenue trend"
      tip="Actual or projected revenue and goal per period. The period in progress is marked Today."
      chart={
        <ReportChart
          chart={chartOf(trend, money)}
          description={`Revenue actual or projected and goal by period${today ? `; today is in ${today.label}` : ''}. The Table view lists every period.`}
        />
      }
      table={table}
      note={totals.goalAfterYear ? goalAfterYearText(money(totals.goalAfterYear)) : undefined}
    />
  );
}

// The period in progress shows its projection, as the Actual or projected card counts it.
function chartOf(trend: SummaryTrendPeriod[], money: (m: Money) => string): ReportChartData {
  const points = (pick: (p: SummaryTrendPeriod) => SummaryTrendPeriod['actual']) =>
    trend.map((p) => moneyPoint(pick(p), money));
  return {
    labels: trend.map((p) => shortPeriod(p.key)),
    unit: moneyUnit(trend.flatMap((p) => [p.goal, p.actual, p.projected])),
    today: trend.findIndex((p) => p.state === 'inProgress'),
    overlap: true,
    series: [
      {
        name: 'Actual',
        tone: 'actual',
        look: 'bar',
        points: points((p) => (p.state === 'actual' ? p.actual : null)),
      },
      {
        name: 'Projected',
        tone: 'planned',
        look: 'bar',
        points: points((p) => (p.state === 'actual' ? null : p.projected)),
      },
      { name: 'Goal', tone: 'budget', look: 'outline', points: points((p) => p.goal) },
    ],
  };
}
