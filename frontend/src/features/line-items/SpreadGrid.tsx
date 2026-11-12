import { useState } from 'react';
import type { components } from '@/api/generated/schema';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import { FieldHelpTip } from '@/features/settings';
import { formatAmount } from '@/format/decimal';
import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import { monthColumns, quarterColumns } from './spread-grid-columns';
import {
  EMPTY,
  GRID_NO_DATES,
  GRID_TITLE,
  gridCaption,
  LINE_ITEM_COLUMN,
  MONTHLY,
  OUTSIDE_DATES,
  OUTSIDE_TIP,
  QUARTERLY,
  TOTAL,
} from './line-item-text';
import { gridPeriodOf } from './schemas';
import type { GridPeriod } from './schemas';
import styles from './SpreadGrid.module.css';

type Grid = components['schemas']['SpreadGrid'];
type Money = components['schemas']['Money'];

const GRID_PERIOD_KEY = 'mapp.lineItemGrid';

export interface SpreadGridProps {
  grid: Grid;
  noDates: boolean;
}

/** The line items by month or quarter (remembered per browser), with a totals row. */
export function SpreadGrid({ grid, noDates }: SpreadGridProps) {
  const [period, setPeriod] = useState<GridPeriod>(readPeriod);
  const shown = period === 'quarterly' ? quarterColumns(grid) : monthColumns(grid);
  const code = grid.total.currency;

  function choose(next: GridPeriod) {
    setPeriod(next);
    try {
      localStorage.setItem(GRID_PERIOD_KEY, next);
    } catch {
      // Storage may be blocked: the choice then lasts until the page is left.
    }
  }

  return (
    <div className={styles.grid}>
      <div className={styles.head}>
        <SectionHeading level={3} rank="sub">
          {GRID_TITLE}
          <FieldHelpTip helpKey="lineItem.spread" label={GRID_TITLE} />
        </SectionHeading>
        <SegmentedFilter
          label="Show the spread by"
          options={[
            { value: 'monthly', label: MONTHLY },
            { value: 'quarterly', label: QUARTERLY },
          ]}
          value={period}
          onChange={choose}
        />
      </div>
      {noDates && <p className={styles.note}>{GRID_NO_DATES}</p>}
      <div className={styles.frame}>
        <ScrollBox label={gridCaption(code)}>
          <table className={cx(dataTable.table, dataTable.bottomHead, styles.table)}>
            <caption className="visually-hidden">{gridCaption(code)}</caption>
            <thead>
              <tr>
                <th scope="col" className={cx(dataTable.sticky, styles.name)}>
                  {LINE_ITEM_COLUMN}
                </th>
                {shown.columns.map((column) => (
                  <th key={column.key} scope="col" className={dataTable.numeric}>
                    <span className={styles.period}>{column.label}</span>
                    {column.outsideActivityDates && (
                      <span className={styles.outside}>
                        {OUTSIDE_DATES}
                        <InfoTip label={`${column.label} outside the dates`} text={OUTSIDE_TIP} />
                      </span>
                    )}
                  </th>
                ))}
                <th scope="col" className={dataTable.numeric}>
                  {TOTAL}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.rows.map((row) => (
                <tr key={row.lineItemId}>
                  <th scope="row" className={cx(dataTable.sticky, styles.name)}>
                    {row.name}
                  </th>
                  {shown.columns.map((column, index) => (
                    <td key={column.key} className={dataTable.numeric}>
                      {amount(row.cells[index] ?? null)}
                    </td>
                  ))}
                  <td className={dataTable.numeric}>{amount(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={dataTable.total}>
                <th scope="row" className={cx(dataTable.sticky, styles.name)}>
                  {TOTAL}
                </th>
                {shown.columns.map((column, index) => (
                  <td key={column.key} className={dataTable.numeric}>
                    {amount(shown.totals[index] ?? null)}
                  </td>
                ))}
                <td className={dataTable.numeric}>{amount(shown.total)}</td>
              </tr>
            </tfoot>
          </table>
        </ScrollBox>
      </div>
    </div>
  );
}

function amount(money: Money | null): string {
  return money ? formatAmount(money.amount) : EMPTY;
}

/** The remembered choice; Monthly when there is none or storage cannot be read. */
function readPeriod(): GridPeriod {
  try {
    return gridPeriodOf(localStorage.getItem(GRID_PERIOD_KEY));
  } catch {
    return 'monthly';
  }
}
