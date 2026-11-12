import { useState } from 'react';
import { toCents } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { Card } from '@/ui/Card/Card';
import { monthsAboveText } from '@/features/all-work';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import { ViewSwitch } from '@/ui/ViewSwitch/ViewSwitch';
import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import type { DashboardMonths, Money } from './api';
import { FINANCE_HIDDEN, monthLabel } from './dashboard-text';
import styles from './Dashboards.module.css';

const WIDTH = 720;
const HEIGHT = 240;
const BASELINE = 210;
const PLOT = 190;

interface MonthlyChartProps {
  months: DashboardMonths;
}

export function MonthlyChart({ months }: MonthlyChartProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { money } = useFormatters();
  const showsActual = months.items.some((month) => month.actual !== null);
  const notes = [
    months.noDates && `Not yet spread (activities without dates): ${money(months.noDates)}`,
    months.otherYears && `Spread into other years: ${money(months.otherYears)}`,
    months.committedOutsideYear &&
      `Committed outside the year (not counted): ${money(months.committedOutsideYear)}`,
    months.paidOutsideYear &&
      `Paid outside the year (not counted): ${money(months.paidOutsideYear)}`,
    !showsActual && `Actual: ${FINANCE_HIDDEN}`,
    months.negativeBalanceCount > 0 && monthsAboveText(months.negativeBalanceCount),
  ].filter((note) => typeof note === 'string');
  const switcher = (
    <ViewSwitch label="Show Planned and actual by month as" value={view} onChange={setView} />
  );
  return (
    <Card title="Planned and actual by month" actions={switcher}>
      {view === 'chart' ? <Bars months={months} /> : <MonthTable months={months} />}
      {notes.map((note) => (
        <p key={note} className={styles.note}>
          {note}
        </p>
      ))}
    </Card>
  );
}

function cents(value: Money | null): bigint {
  return value ? toCents(value.amount) : 0n;
}

function height(value: bigint, top: bigint): number {
  return top > 0n && value > 0n ? Number((value * BigInt(PLOT)) / top) : 0;
}

function Bars({ months }: MonthlyChartProps) {
  const { money } = useFormatters();
  const top = months.items.reduce(
    (largest, m) => [cents(m.planned), cents(m.actual), largest].reduce((a, b) => (a > b ? a : b)),
    0n,
  );
  const group = WIDTH / Math.max(months.items.length, 1);
  const last = months.items.at(-1);
  const summary = `Planned cost by month; ${money(last?.plannedToDate ?? null)} planned for the year and ${money(last?.actualToDate ?? null)} paid so far. The Table view lists every month.`;
  return (
    <>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.planned}`} aria-hidden="true" />
          Planned cost
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.actual}`} aria-hidden="true" />
          Actual (paid)
        </li>
      </ul>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={summary}
      >
        {months.items.map((m, i) => {
          const planned = height(cents(m.planned), top);
          const actual = height(cents(m.actual), top);
          const x = i * group + group * 0.15;
          const bar = group * 0.35;
          return (
            <g key={m.month}>
              <rect
                className={styles.planned}
                x={x}
                y={BASELINE - planned}
                width={bar}
                height={planned}
              />
              <rect
                className={styles.actual}
                x={x + bar}
                y={BASELINE - actual}
                width={bar}
                height={actual}
              />
              <text className={styles.axisLabel} x={x + bar} y={HEIGHT - 12} textAnchor="middle">
                {monthLabel(m.month).slice(0, 3)}
              </text>
            </g>
          );
        })}
        <line className={styles.axis} x1={0} x2={WIDTH} y1={BASELINE} y2={BASELINE} />
      </svg>
    </>
  );
}

function MonthTable({ months }: MonthlyChartProps) {
  const { money } = useFormatters();
  return (
    <ScrollBox label="Planned cost and actual paid by month">
      <table className={cx(dataTable.table, styles.table)}>
        <caption className="visually-hidden">
          Planned cost spread by month and actual paid by posting month, with running totals
        </caption>
        <thead>
          <tr>
            {['Month', 'Planned cost', 'Actual', 'Planned to date', 'Actual to date'].map(
              (title, i) => (
                <th key={title} scope="col" className={i > 0 ? dataTable.numeric : undefined}>
                  {title}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {months.items.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthLabel(m.month)}</th>
              <td className={dataTable.numeric}>{money(m.planned)}</td>
              <td className={dataTable.numeric}>{money(m.actual)}</td>
              <td className={dataTable.numeric}>{money(m.plannedToDate)}</td>
              <td className={dataTable.numeric}>{money(m.actualToDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  );
}
