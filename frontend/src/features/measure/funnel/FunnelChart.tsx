import { useFormatters } from '@/format/useFormatters';
import {
  countPoint,
  goalAfterYearText,
  PeriodSwitch,
  ReportChart,
  ReportWidget,
  shortPeriod,
} from '../shared';
import type { ReportChartData, ReportTableData } from '../shared';
import type { FunnelPeriod, FunnelReport } from '../revenue/api';
import { reasonText } from './reasons';

/** One funnel stage's goal, actual and projected by period, split at today (049-C4). */
export function FunnelChart({ report }: { report: FunnelReport }) {
  const { month } = useFormatters();
  const label = (key: string) => (key.includes('Q') ? key.slice(5) : month(key));
  const whole = (value: number | null) => (value === null ? '—' : value.toLocaleString());
  const today = report.periods.find((p) => p.inProgress);
  const totals = report.totals;
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      ...['Goal', 'Actual', 'Projected'].map((column) => ({ label: column, numeric: true })),
    ],
    rows: report.periods.map((p) => ({
      key: p.key,
      cells: [label(p.key), whole(p.goal), whole(p.actual), whole(p.projected)],
    })),
    total: report.periods.length
      ? [whole(totals.goal), whole(totals.actual), whole(totals.projected)]
      : undefined,
  };
  return (
    <ReportWidget
      wide
      report="funnel"
      widget="periods"
      controls={<PeriodSwitch />}
      title={report.period === 'quarter' ? 'Volume by quarter' : 'Volume by month'}
      tip="Actual to the end of the last period, projected from today, against the activities' goal."
      chart={
        <ReportChart
          chart={chartOf(report.periods)}
          description={`Goal, actual and projected volume by period${today ? `; today is in ${label(today.key)}` : ''}. The Table view lists every period.`}
        />
      }
      table={table}
      note={
        [
          report.reason && reasonText(report.reason),
          totals.goalAfterYear !== null && goalAfterYearText(whole(totals.goalAfterYear)),
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
    />
  );
}

function chartOf(periods: FunnelPeriod[]): ReportChartData {
  const points = (pick: (p: FunnelPeriod) => number | null) =>
    periods.map((p) => countPoint(pick(p)));
  return {
    labels: periods.map((p) => shortPeriod(p.key)),
    unit: { kind: 'count' },
    today: periods.findIndex((p) => p.inProgress),
    overlap: true,
    series: [
      { name: 'Projected', tone: 'planned', look: 'bar', points: points((p) => p.projected) },
      { name: 'Actual', tone: 'actual', look: 'bar', points: points((p) => p.actual) },
      { name: 'Goal', tone: 'budget', look: 'outline', points: points((p) => p.goal) },
    ],
  };
}
