import { useState } from 'react';
import { exact } from '@/format/decimal';
import { formatMoney } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { cx } from '@/ui/cx';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Pager } from '@/ui/Pager/Pager';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import dataTable from '@/ui/Table/Table.module.css';
import type { DatasetColumn } from '../model';
import { ROWS_PER_PAGE, useDatasetRows } from './api';
import styles from './datasets.module.css';

export function RowsTable({ datasetId }: { datasetId: string }) {
  const [offset, setOffset] = useState(0);
  const page = useDatasetRows(datasetId, offset);
  const { date } = useFormatters();

  if (!page.data) {
    return page.isError ? (
      <ErrorState error={page.error} onRetry={() => void page.refetch()} />
    ) : (
      <div aria-label="Loading rows">
        <Skeleton lines={5} height="20px" />
      </div>
    );
  }
  const { columns, rows, total } = page.data;
  if (total === 0) {
    return <p className={styles.facts}>This dataset has no rows.</p>;
  }

  return (
    <>
      <div
        role="region"
        aria-label="Rows"
        tabIndex={0}
        className={styles.scroller}
        aria-busy={page.isFetching || undefined}
      >
        <table className={cx(dataTable.table, styles.table)}>
          <caption className="visually-hidden">Rows of the dataset</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(isFigure(column) && dataTable.numeric)}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={page.data.offset + rowIndex}>
                {columns.map((column, index) => (
                  <td key={column.key} className={cx(isFigure(column) && dataTable.numeric)}>
                    {cellText(row[index] ?? null, column, date)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        page={Math.floor(page.data.offset / ROWS_PER_PAGE) + 1}
        pageSize={ROWS_PER_PAGE}
        total={total}
        placement="below"
        onPage={(next) => setOffset((next - 1) * ROWS_PER_PAGE)}
      />
    </>
  );
}

const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

function isFigure(column: DatasetColumn): boolean {
  return column.kind === 'number' || column.kind === 'money';
}

function cellText(
  value: string | null,
  column: DatasetColumn,
  date: (day: string) => string,
): string {
  if (value === null) {
    return '—';
  }
  switch (column.kind) {
    case 'date':
      return date(value);
    case 'money':
      return formatMoney(value, column.currency ?? 'USD');
    case 'number':
      return numbers.format(exact(value));
    case 'text':
      return value;
    default: {
      const unknown: never = column.kind;
      return unknown;
    }
  }
}
