import { toCents } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { RevenueSectionData, SummaryTrendPeriod } from './api';
import { STAGE, VARIANCE, percentText } from './words';
import styles from './Summary.module.css';

const WIDTH = 720;
const HEIGHT = 220;
const BASELINE = 190;
const PLOT = 170;

/** Revenue against goal: the fixed cards, Goal coverage and the trend split at today. */
export function RevenueSection({ revenue }: { revenue: RevenueSectionData }) {
  const { money } = useFormatters();
  const coverage = revenue.goalCoverage
    .map((c) => `${STAGE[c.stage]} ${percentText(c.percent)}`)
    .join(' · ');
  return (
    <section className={styles.section} aria-labelledby="summary-revenue">
      <h2 id="summary-revenue" className={styles.heading}>
        Revenue · {revenue.periodLabel}
      </h2>
      <div className={styles.cards} aria-label="Revenue figures">
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
          detail={VARIANCE[revenue.variance]}
          tip="Actual or projected ÷ goal, as a whole per cent."
        />
        <SummaryCard
          label="Goal coverage"
          value={coverage}
          tip="The activities' goals ÷ the plans' goals per stage: how much of each plan's goal is planned in activities. It is not performance."
        />
      </div>
      <TrendWidget trend={revenue.trend} />
    </section>
  );
}

function TrendWidget({ trend }: { trend: SummaryTrendPeriod[] }) {
  const { money } = useFormatters();
  const amount = (value: SummaryTrendPeriod['actual']) => (value ? money(value) : '—');
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      ...['Actual', 'Projected', 'Goal'].map((label) => ({ label, numeric: true })),
    ],
    rows: trend.map((p) => ({
      key: p.key,
      cells: [p.label, amount(p.actual), amount(p.projected), amount(p.goal)],
    })),
  };
  return (
    <ReportWidget
      report="summary"
      widget="trend"
      title="Revenue trend"
      tip="Actual or projected revenue and goal per period. The period in progress is marked Today."
      chart={<TrendBars trend={trend} />}
      table={table}
    />
  );
}

function cents(value: SummaryTrendPeriod['actual']): bigint {
  return value ? toCents(value.amount) : 0n;
}

function shown(p: SummaryTrendPeriod): bigint {
  return p.state === 'actual' ? cents(p.actual) : cents(p.projected);
}

function TrendBars({ trend }: { trend: SummaryTrendPeriod[] }) {
  const top = trend.flatMap((p) => [shown(p), cents(p.goal)]).reduce((a, b) => (a > b ? a : b), 0n);
  const scale = (v: bigint) => (top > 0n && v > 0n ? Number((v * BigInt(PLOT)) / top) : 0);
  const group = WIDTH / Math.max(trend.length, 1);
  const bar = group * 0.35;
  const today = trend.find((p) => p.state === 'inProgress');
  return (
    <>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.actual}`} aria-hidden="true" />
          Actual or projected
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.goal}`} aria-hidden="true" />
          Goal
        </li>
      </ul>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Revenue actual or projected and goal by period${today ? `; today is in ${today.label}` : ''}. The Table view lists every period.`}
      >
        {trend.map((p, i) => {
          const x = i * group + group * 0.15;
          const value = scale(shown(p));
          const goal = scale(cents(p.goal));
          return (
            <g key={p.key}>
              {p.state === 'inProgress' && (
                <rect
                  className={styles.today}
                  x={i * group}
                  y={0}
                  width={group}
                  height={BASELINE}
                />
              )}
              <rect
                className={p.state === 'projected' ? styles.projected : styles.actual}
                x={x}
                y={BASELINE - value}
                width={bar}
                height={value}
              />
              <rect
                className={styles.goal}
                x={x + bar}
                y={BASELINE - goal}
                width={bar}
                height={goal}
              />
              <text className={styles.axisLabel} x={x + bar} y={HEIGHT - 10} textAnchor="middle">
                {p.state === 'inProgress' ? 'Today' : p.label.slice(0, 3)}
              </text>
            </g>
          );
        })}
        <line className={styles.axis} x1={0} x2={WIDTH} y1={BASELINE} y2={BASELINE} />
      </svg>
    </>
  );
}
