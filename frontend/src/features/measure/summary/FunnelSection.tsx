import type { ReactNode } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { ReportChart, ReportWidget, shortPeriod } from '../shared';
import type { ReportChartData, ReportTableData } from '../shared';
import type { FunnelSectionData, SummaryFigure } from './api';
import { varianceText } from '../revenue/variance';
import { STAGE, VARIANCE_TONE, percentText, rateText } from './words';
import styles from './Summary.module.css';
import { PeriodSwitch } from '../shared';

type Rate = FunnelSectionData['trend']['periods'][number];
type Variance = FunnelSectionData['stages'][number]['variance'];

interface StageCell {
  key: string;
  label: string;
  value: string;
  goal: string;
  performance: string;
  variance: Variance | null;
  tip?: string;
  reason?: string;
}

const CONVERSION_TIP =
  "This stage's actual ÷ the previous stage's actual, to one decimal. Its goal is the same ratio of the goals.";
const NO_RATE = 'No rate until the stage before has actuals.';

/** The funnel: each stage against goal, the conversions between counted stages and their trend. */
export function FunnelSection({
  funnel,
  details,
}: {
  funnel: FunnelSectionData;
  details?: ReactNode;
}) {
  const { money } = useFormatters();
  const figure = (v: SummaryFigure) =>
    v === null ? '—' : typeof v === 'number' ? v.toLocaleString('en-GB') : money(v);
  const cells: StageCell[] = [
    ...funnel.stages.map((s) => ({
      key: s.stage,
      label: STAGE[s.stage],
      value: figure(s.actualOrProjected),
      goal: figure(s.goal),
      performance: percentText(s.performance),
      variance: s.variance,
    })),
    ...funnel.conversions.map((c) => ({
      key: `${c.stage}-conversion`,
      label: `${STAGE[c.stage]} conversion`,
      value: rateText(c.rate),
      goal: rateText(c.goal),
      performance: '',
      reason: c.rate === null ? NO_RATE : undefined,
      variance: c.variance,
      tip: CONVERSION_TIP,
    })),
  ];
  const stages: ReportTableData = {
    columns: [
      { label: 'Stage' },
      ...['Actual or projected', 'Goal', 'Performance'].map((label) => ({ label, numeric: true })),
      { label: 'Variance' },
    ],
    rows: cells.map((c) => ({
      key: c.key,
      cells: [
        c.label,
        c.value,
        c.goal,
        c.performance || '—',
        c.variance ? varianceText(c.variance) : '—',
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
      <div className={styles.sectionHead}>
        <h2 id="summary-funnel" className={styles.heading}>
          Funnel
        </h2>
        {details}
      </div>
      <ReportWidget
        report="summary"
        widget="funnel"
        title="Funnel stages"
        tip="Actual or projected volume at each stage any model in view allows, against the activities' goals."
        note={note}
        chart={<StageStrip cells={cells} />}
        table={stages}
      />
      <ConversionTrend periods={funnel.trend.periods} stage={STAGE[funnel.trend.stage]} />
    </section>
  );
}

function StageStrip({ cells }: { cells: StageCell[] }) {
  return (
    <div className={styles.stageStrip}>
      <StatStrip label="Stage figures">
        {cells.map((c) => (
          <SummaryCard
            key={c.key}
            label={c.label}
            value={c.value}
            tip={c.tip}
            detail={
              <>
                <span className={styles.stageDetail}>
                  <span>
                    Goal {c.goal}
                    {c.performance && ` · ${c.performance}`}
                  </span>
                  {c.variance && (
                    <StatusChip tone={VARIANCE_TONE[c.variance]}>
                      {varianceText(c.variance)}
                    </StatusChip>
                  )}
                </span>
                {c.reason && <span>{c.reason}</span>}
              </>
            }
          />
        ))}
      </StatStrip>
    </div>
  );
}

function ConversionTrend({ periods, stage }: { periods: Rate[]; stage: string }) {
  const today = periods.find((p) => p.state === 'inProgress');
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
      wide
      report="summary"
      widget="conversion"
      controls={<PeriodSwitch />}
      title={`${stage} conversion trend`}
      tip="The conversion rate per period against its goal: actual until today, projected after."
      empty={
        periods.length === 0 ? 'No data yet: the models in view count only one stage.' : undefined
      }
      chart={
        <ReportChart
          chart={chartOf(periods)}
          description={`Conversion rate and its goal by period${today ? `; today is in ${today.label}` : ''}. The Table view lists every period.`}
        />
      }
      table={table}
    />
  );
}

function chartOf(periods: Rate[]): ReportChartData {
  const points = (pick: (p: Rate) => string | null) =>
    periods.map((p) => {
      const rate = pick(p);
      return rate === null ? null : { value: Number(rate), text: rateText(rate) };
    });
  return {
    labels: periods.map((p) => shortPeriod(p.key)),
    unit: { kind: 'percent' },
    today: periods.findIndex((p) => p.state === 'inProgress'),
    series: [
      { name: 'Conversion rate', tone: 'actual', look: 'line', points: points((p) => p.rate) },
      { name: 'Goal', tone: 'budget', look: 'dashed', points: points((p) => p.goal) },
    ],
  };
}
