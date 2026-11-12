import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { cx } from '@/ui/cx';
import { Pager as SharedPager } from '@/ui/Pager/Pager';
import { downloadReport, ExportMenu, useReportAddress } from '../shared';
import { PAGE_SIZES } from './gsap-address';
import type { GsapTable } from './gsap-address';
import styles from './GsapLink.module.css';

export interface PagedColumn<R> {
  /** The column's sort key in the contract. */
  key: string;
  label: string;
  numeric?: boolean;
  /** Waiting, dates and amounts sort largest first on the first click. */
  largestFirst?: boolean;
  /** False for a column the contract does not sort by: a plain heading. */
  sortable?: boolean;
  cell: (row: R) => ReactNode;
}

export interface PagedTableProps<R> {
  title: string;
  /** The widget's key in the export (contract: swbs, waiting, orders). */
  widget: string;
  columns: PagedColumn<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  table: GsapTable;
  total: number;
  /** Said when the tab has no row at all. */
  empty: string;
  /** The totals row over every page, one cell per column. */
  totals?: ReactNode[];
  onChange: (patch: Partial<GsapTable>) => void;
}

/** A tab's table card: its title and export of every row, then the page of rows. */
export function PagedTable<R>(props: PagedTableProps<R>) {
  const { title, widget } = props;
  const headingId = useId();
  const [address] = useReportAddress();
  const [own] = useSearchParams();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <h2 id={headingId} className={styles.heading}>
          {title}
        </h2>
        <ExportMenu
          label={`Export ${title}`}
          iconOnly
          formats={['xlsx', 'csv']}
          download={(format) => downloadReport('gsapLink', address, format, { widget, own })}
        />
      </div>
      <Rows {...props} />
    </section>
  );
}

/** One page of a tab's rows, sorted by any column, with the page size and the pages. */
function Rows<R>(props: PagedTableProps<R>) {
  const { title, columns, rows, rowKey, table, total, empty, totals, onChange } = props;
  if (total === 0) {
    return <EmptyState title="No data yet" text={empty} />;
  }
  return (
    <>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="visually-hidden">{title}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <SortHeading
                  key={column.key}
                  column={column}
                  sort={table.sort}
                  onSort={(sort) => onChange({ sort })}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cx(column.numeric && styles.numeric)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr>
                {totals.map((cell, i) => (
                  <td
                    key={columns[i]?.key ?? i}
                    className={cx(columns[i]?.numeric && styles.numeric)}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <Pager table={table} total={total} onChange={onChange} />
    </>
  );
}

interface SortHeadingProps<R> {
  column: PagedColumn<R>;
  sort: string;
  onSort: (sort: string) => void;
}

/** A heading that sorts by its column; a second click turns the order round. */
function SortHeading<R>({ column, sort, onSort }: SortHeadingProps<R>) {
  if (column.sortable === false) {
    return (
      <th scope="col" className={cx(column.numeric && styles.numeric)}>
        {column.label}
      </th>
    );
  }
  const current = sort.replace(/^-/, '') === column.key;
  const descending = sort.startsWith('-');
  const Icon = !current ? ArrowUpDown : descending ? ArrowDown : ArrowUp;
  const next = current ? !descending : Boolean(column.largestFirst);
  return (
    <th
      scope="col"
      className={cx(column.numeric && styles.numeric)}
      aria-sort={current ? (descending ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        className={styles.sort}
        onClick={() => onSort(`${next ? '-' : ''}${column.key}`)}
      >
        {column.label}
        <Icon aria-hidden="true" className={current ? undefined : styles.idle} />
      </button>
    </th>
  );
}

interface PagerProps {
  table: GsapTable;
  total: number;
  onChange: (patch: Partial<GsapTable>) => void;
}

function Pager({ table, total, onChange }: PagerProps) {
  return (
    <SharedPager
      className={styles.pager}
      page={table.page}
      pageSize={table.pageSize}
      total={total}
      sizes={PAGE_SIZES}
      onPage={(page) => onChange({ page })}
      onPageSize={(pageSize) => onChange({ pageSize })}
    />
  );
}
