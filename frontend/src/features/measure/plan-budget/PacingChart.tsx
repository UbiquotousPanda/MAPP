import { toCents } from '@/format/decimal';
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
import type { PlanBudgetPeriod, PlanBudgetReport } from './api';

type Money = PlanBudgetPeriod['budget'];

/** Budget, planned cost and actual per period; actual stops at today's period, which is marked. */
export function PacingChart({ report }: { report: PlanBudgetReport }) {
  const { money, month } = useFormatters();
  const label = (key: string) => (key.includes('Q') ? key.slice(5) : month(key));
  const amount = (value: PlanBudgetPeriod['actual']) => (value ? money(value) : '—');
  const today = report.periods.find((p) => p.state === 'inProgress');
  const table: ReportTableData = {
    columns: [
      { label: 'Period' },
      ...[
        'Budget',
        'Planned cost',
        'Actual',
        'Budget to date',
        'Planned to date',
        'Actual to date',
      ].map((column) => ({ label: column, numeric: true })),
    ],
    rows: report.periods.map((p) => ({
      key: p.key,
      cells: [
        p.state === 'inProgress' ? `${label(p.key)} (in progress)` : label(p.key),
        money(p.budget),
        money(p.planned),
        amount(p.actual),
        money(p.budgetToDate),
        money(p.plannedToDate),
        amount(p.actualToDate),
      ],
    })),
  };
  return (
    <ReportWidget
      wide
      report="planBudget"
      widget="periods"
      controls={<PeriodSwitch />}
      title={report.period === 'quarter' ? 'Spend by quarter' : 'Spend by month'}
      tip="Budget as phased, planned cost as spread and actual by posting date; actual stops at today."
      chart={
        <ReportChart
          chart={chartOf(report.periods, money)}
          description={`${phased(report.periods) ? 'Budget, planned cost' : 'Planned cost'} and actual by period${today ? `; today is in ${label(today.key)}` : ''}. The Table view lists every period.`}
        />
      }
      table={table}
      note={notesOf(report, money).join(' ') || undefined}
    />
  );
}

function notesOf(report: PlanBudgetReport, money: (m: Money) => string): string[] {
  const n = report.notes;
  return [
    n.notPhased && `Budget not phased by month: ${money(n.notPhased)}.`,
    n.noDates && `Planned cost without dates: ${money(n.noDates)}.`,
    n.otherYears && `Planned cost in other years: ${money(n.otherYears)}.`,
    n.actualOtherYears && `Actual posted in other years: ${money(n.actualOtherYears)}.`,
  ].filter((note): note is string => Boolean(note));
}

// A budget that is not phased by month has no amount per period: the note under the chart names it.
function phased(periods: PlanBudgetPeriod[]): boolean {
  return periods.some((p) => toCents(p.budget.amount) !== 0n);
}

function chartOf(periods: PlanBudgetPeriod[], money: (m: Money) => string): ReportChartData {
  const points = (pick: (p: PlanBudgetPeriod) => Money | null) =>
    periods.map((p) => moneyPoint(pick(p), money));
  return {
    labels: periods.map((p) => shortPeriod(p.key)),
    unit: moneyUnit(periods.map((p) => p.planned)),
    today: periods.findIndex((p) => p.state === 'inProgress'),
    series: [
      {
        name: 'Budget',
        tone: 'budget',
        look: 'outline',
        points: phased(periods) ? points((p) => p.budget) : [],
      },
      { name: 'Planned cost', tone: 'planned', look: 'bar', points: points((p) => p.planned) },
      { name: 'Actual', tone: 'actual', look: 'bar', points: points((p) => p.actual) },
    ],
  };
}
