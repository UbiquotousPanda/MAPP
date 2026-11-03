import { useFormatters } from '@/format/useFormatters';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { FunnelSectionData, SummaryFigure } from './api';
import { varianceText } from '../revenue/variance';
import { STAGE, percentText, rateText } from './words';
import styles from './Summary.module.css';

const WIDTH = 720;
const HEIGHT = 160;
const PLOT = 130;

type Rate = FunnelSectionData['trend']['periods'][number];

/** The funnel: each stage against goal, the conversions between counted stages and their trend. */
export function FunnelSection({ funnel }: { funnel: FunnelSectionData }) {
  const { money } = useFormatters();
  const figure = (v: SummaryFigure) =>
    v === null ? '—' : typeof v === 'number' ? v.toLocaleString('en-GB') : money(v);
  const stages: ReportTableData = {
    columns: [
      { label: 'Stage' },
      ...['Actual or projected', 'Goal', 'Performance'].map((label) => ({ label, numeric: true })),
      { label: 'Variance' },
    ],
    rows: funnel.stages.map((s) => ({
      key: s.stage,
      cells: [
        STAGE[s.stage],
        figure(s.actualOrProjected),
        figure(s.goal),
        percentText(s.performance),
        varianceText(s.variance),
      ],
    })),
  };
  const note =
    funnel.stages
      .filter((s) => s.plansWithout > 0)
      .map(
        (s) =>
          `${STAGE[s.stage]} leaves out ${s.plansWithout} ${s.plansWithout === 1 ? 'plan' : 'plans'} whose model does not have it.`,
      )
      .join(' ') || undefined;
  return (
    <section className={styles.section} aria-labelledby="summary-funnel">
      <h2 id="summary-funnel" className={styles.heading}>
        Funnel
      </h2>
      <ReportWidget
        report="summary"
        widget="funnel"
        title="Funnel stages"
        tip="Actual or projected volume at each stage any model in view allows, against the activities' goals."
        note={note}
        chart={<StageBlocks rows={stages.rows.map((r) => r.cells)} />}
        table={stages}
      />
      <div className={styles.cards} aria-label="Conversions">
        {funnel.conversions.map((c) => (
          <SummaryCard
            key={c.stage}
            label={`${STAGE[c.stage]} conversion`}
            value={rateText(c.rate)}
            detail={`Goal ${rateText(c.goal)} · ${c.variance ? varianceText(c.variance) : '—'}`}
            tip="This stage's actual ÷ the previous stage's actual, to one decimal. Its goal is the same ratio of the goals."
          />
        ))}
      </div>
      <ConversionTrend periods={funnel.trend.periods} stage={STAGE[funnel.trend.stage]} />
    </section>
  );
}

function StageBlocks({ rows }: { rows: string[][] }) {
  return (
    <ol className={styles.stages}>
      {rows.map(([stage, value, goal, performance, variance]) => (
        <li key={stage} className={styles.stage}>
          <span className={styles.stageName}>{stage}</span>
          <span className={styles.stageValue}>{value}</span>
          <span>
            Goal {goal} · {performance} · {variance}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ConversionTrend({ periods, stage }: { periods: Rate[]; stage: string }) {
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      { label: 'Rate', numeric: true },
      { label: 'Goal', numeric: true },
    ],
    rows: periods.map((p) => ({
      key: p.key,
      cells: [p.label, rateText(p.rate), rateText(p.goal)],
    })),
  };
  return (
    <ReportWidget
      report="summary"
      widget="conversion"
      title={`${stage} conversion trend`}
      tip="The conversion rate per period against its goal: actual until today, projected after."
      empty={
        periods.length === 0 ? 'No data yet: the models in view count only one stage.' : undefined
      }
      chart={<RateLines periods={periods} />}
      table={table}
    />
  );
}

function RateLines({ periods }: { periods: Rate[] }) {
  const values = periods.flatMap((p) => [Number(p.rate ?? 0), Number(p.goal ?? 0)]);
  const top = Math.max(...values, 1);
  const step = WIDTH / Math.max(periods.length - 1, 1);
  const line = (pick: (p: Rate) => string | null) =>
    periods
      .map((p, i) => `${i * step},${HEIGHT - 10 - (Number(pick(p) ?? 0) / top) * PLOT}`)
      .join(' ');
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Conversion rate and its goal by period. The Table view lists every period."
    >
      <polyline className={styles.goalLine} points={line((p) => p.goal)} />
      <polyline className={styles.rateLine} points={line((p) => p.rate)} />
    </svg>
  );
}
