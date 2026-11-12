import { useFormatters } from '@/format/useFormatters';
import {
  moneyPoint,
  moneyUnit,
  PeriodSwitch,
  ReportChart,
  ReportWidget,
  shortPeriod,
} from '../shared';
import type { ReportChartData, ReportTableData } from '../shared';
import type { RevenuePeriod, RevenueReport } from './api';
import { reasonText } from './reasons';

/** Revenue goal, actual and projected by period, split at today (049-C4). */
export function RevenueChart({ report }: { report: RevenueReport }) {
  const { money, month } = useFormatters();
  const label = (key: string) => (key.includes('Q') ? key.slice(5) : month(key));
  const amount = (value: RevenuePeriod['actual']) => (value ? money(value) : '—');
  const today = report.periods.find((p) => p.inProgress);
  const totals = report.totals;
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      ...['Goal', 'Actual', 'Projected'].map((column) => ({ label: column, numeric: true })),
    ],
    rows: report.periods.map((p) => ({
      key: p.key,
      cells: [label(p.key), amount(p.goal), amount(p.actual), amount(p.projected)],
    })),
    total: report.periods.length
      ? ['Total', amount(totals.goal), amount(totals.actual), amount(totals.projected)]
      : undefined,
  };
  return (
    <ReportWidget
      wide
      report="revenue"
      widget="periods"
      controls={<PeriodSwitch />}
      title={report.period === 'quarter' ? 'Revenue by quarter' : 'Revenue by month'}
      tip="Actual to the end of the last period, projected from today, against the activities' goal."
      chart={
        <ReportChart
          chart={chartOf(report, money)}
          description={`Revenue goal, actual and projected by period${today ? `; today is in ${label(today.key)}` : ''}. The Table view lists every period.`}
        />
      }
      table={table}
      note={report.reason ? reasonText(report.reason) : undefined}
    />
  );
}

function chartOf(
  report: RevenueReport,
  money: (m: NonNullable<RevenuePeriod['actual']>) => string,
): ReportChartData {
  const points = (pick: (p: RevenuePeriod) => RevenuePeriod['actual']) =>
    report.periods.map((p) => moneyPoint(pick(p), money));
  return {
    labels: report.periods.map((p) => shortPeriod(p.key)),
    unit: moneyUnit(report.periods.flatMap((p) => [p.goal, p.actual, p.projected])),
    today: report.periods.findIndex((p) => p.inProgress),
    overlap: true,
    series: [
      { name: 'Projected', tone: 'planned', look: 'bar', points: points((p) => p.projected) },
      { name: 'Actual', tone: 'actual', look: 'bar', points: points((p) => p.actual) },
      { name: 'Goal', tone: 'budget', look: 'outline', points: points((p) => p.goal) },
    ],
  };
}
