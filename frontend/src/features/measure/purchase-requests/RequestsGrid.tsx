import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { RequestsGridData } from './api';
import { lineText, NUMERIC, requestText, vendorText } from './cells';
import type { Format } from './cells';
import { GridPager } from './GridPager';
import { GridRows } from './GridRows';
import { GridToolbar } from './GridToolbar';
import type { ColumnKey, RequestsParams, SortKey } from './schemas';
import { COLUMN_WORDS, SORTABLE } from './words';
import styles from './PurchaseRequests.module.css';

const TIP =
  'Vendors, then their purchase requests, then each request’s lines and the line item a line pays for. Open a ' +
  'row to see what is below it. Amounts are in the display currency; a dash means you cannot see financial data.';

export interface RequestsGridProps {
  grid?: RequestsGridData;
  covers?: { plans: number; of: number };
  params: RequestsParams;
  onParams: (changes: Partial<RequestsParams>) => void;
  failed?: boolean;
  onRetry?: () => void;
}

function financeNote(covers?: { plans: number; of: number }): string | undefined {
  if (!covers || covers.of === 0 || covers.plans === covers.of) {
    return undefined;
  }
  return covers.plans === 0
    ? 'You can’t see financial data for these plans, so amounts show —.'
    : `Amounts cover ${covers.plans} of ${covers.of} plans; the rest need financial data access.`;
}

function SortHeading(props: {
  column: ColumnKey;
  params: RequestsParams;
  onParams: RequestsGridProps['onParams'];
}) {
  const { column, params, onParams } = props;
  const numeric = NUMERIC.includes(column) ? styles.numeric : undefined;
  const key = SORTABLE.find((s) => s === column);
  const sortable = params.columns.includes(column) && key !== undefined;
  if (!sortable) {
    return (
      <th scope="col" className={numeric}>
        {COLUMN_WORDS[column]}
      </th>
    );
  }
  const current = params.sort === column;
  const Icon = !current ? ArrowUpDown : params.order === 'asc' ? ArrowUp : ArrowDown;
  const sortBy = () => {
    const sort: SortKey = params.sort === column ? params.sort : toSort(column);
    onParams({ sort, order: current && params.order === 'asc' ? 'desc' : 'asc' });
  };
  return (
    <th
      scope="col"
      className={numeric}
      aria-sort={current ? (params.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className={styles.sort} onClick={sortBy}>
        {COLUMN_WORDS[column]}
        <Icon aria-hidden="true" className={current ? undefined : styles.idle} />
      </button>
    </th>
  );
}

function toSort(column: ColumnKey): SortKey {
  switch (column) {
    case 'status':
    case 'amount':
    case 'invoiced':
    case 'created':
    case 'delivery':
      return column;
    default:
      return 'name';
  }
}

function tableOf(grid: RequestsGridData, columns: ColumnKey[], f: Format): ReportTableData {
  const rows: ReportTableData['rows'] = [];
  for (const v of grid.vendors) {
    rows.push({ key: `v:${v.vendor}`, cells: columns.map((c) => vendorText(v, c, f)) });
    for (const r of v.requests) {
      rows.push({ key: `r:${r.id}`, cells: columns.map((c) => requestText(r, c, f)) });
      for (const l of r.lines) {
        rows.push({ key: `l:${l.id}`, cells: columns.map((c) => lineText(l, c, f)) });
      }
    }
  }
  return {
    columns: columns.map((c) => ({ label: COLUMN_WORDS[c], numeric: NUMERIC.includes(c) })),
    rows,
  };
}

function Empty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return filtered ? (
    <div className={styles.empty}>
      <p>Your filters exclude everything.</p>
      <Button type="button" variant="secondary" size="sm" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  ) : (
    <p className={styles.empty}>
      No purchase requests yet. Raise one from an approved activity’s line items.
    </p>
  );
}

export function RequestsGrid({
  grid,
  covers,
  params,
  onParams,
  failed,
  onRetry,
}: RequestsGridProps) {
  const { money, date } = useFormatters();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  const filtered = Boolean(
    params.q || params.vendors.length || params.requestOwners.length || params.statuses.length,
  );
  const reset = () => onParams({ q: '', vendors: [], requestOwners: [], statuses: [] });
  const empty: ReportTableData = { columns: [{ label: 'Name' }], rows: [] };
  return (
    <ReportWidget
      report="purchaseRequests"
      widget="grid"
      title="Purchase requests"
      tip={TIP}
      note={financeNote(covers)}
      loading={!grid && !failed}
      failed={failed}
      onRetry={onRetry}
      table={grid ? tableOf(grid, params.columns, { money, date }) : empty}
      chart={
        grid && (
          <>
            <GridToolbar choices={grid.choices} params={params} onChange={onParams} />
            {grid.total === 0 ? (
              <Empty filtered={filtered} onReset={reset} />
            ) : (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <caption className="visually-hidden">Purchase requests by vendor</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="visually-hidden">Open or close</span>
                      </th>
                      {params.columns.map((c) => (
                        <SortHeading key={c} column={c} params={params} onParams={onParams} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.vendors.map((v) => (
                      <GridRows
                        key={v.vendor}
                        vendor={v}
                        columns={params.columns}
                        open={open}
                        onToggle={toggle}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <GridPager grid={grid} onParams={onParams} />
          </>
        )
      }
    />
  );
}
