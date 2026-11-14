import { useId } from 'react';
import type { ReactNode } from 'react';
import { useAddressParams } from '@/ui/useAddressParams';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { cx } from '@/ui/cx';
import { Pager } from '@/ui/Pager/Pager';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import dataTable from '@/ui/Table/Table.module.css';
import { TotalLabel } from '@/ui/Table/TotalLabel';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
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
  /** The totals row over every page, one cell per column after the first (which reads "Total"). */
  totals?: ReactNode[];
  onChange: (patch: Partial<GsapTable>) => void;
}

/** A tab's table card: its title and export of every row, then the page of rows. */
export function PagedTable<R>(props: PagedTableProps<R>) {
  const { title, widget } = props;
  const headingId = useId();
  const [address] = useReportAddress();
  const [own] = useAddressParams();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <SectionHeading level={2} rank="card" id={headingId}>
          {title}
        </SectionHeading>
        <ExportMenu
          label={`Export ${title}`}
          iconOnly
          formats={['xlsx', 'csv']}
          download={(format) => downloadReport('purchasing', address, format, { widget, own })}
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
      <div className={dataTable.scroll}>
        <table className={cx(dataTable.table, styles.table)}>
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
                  <td key={column.key} className={cx(column.numeric && dataTable.numeric)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className={dataTable.total}>
                <th scope="row">
                  <TotalLabel />
                </th>
                {totals.map((cell, i) => (
                  <td
                    key={columns[i + 1]?.key ?? i}
                    className={cx(columns[i + 1]?.numeric && dataTable.numeric)}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <Pager
        placement="cardFooter"
        page={table.page}
        pageSize={table.pageSize}
        total={total}
        sizes={PAGE_SIZES}
        onPage={(page) => onChange({ page })}
        onPageSize={(pageSize) => onChange({ pageSize })}
      />
    </>
  );
}

interface SortHeadingProps<R> {
  column: PagedColumn<R>;
  sort: string;
  onSort: (sort: string) => void;
}

function SortHeading<R>({ column, sort, onSort }: SortHeadingProps<R>) {
  if (column.sortable === false) {
    return (
      <th scope="col" className={cx(column.numeric && dataTable.numeric)}>
        {column.label}
      </th>
    );
  }
  const current = sort.replace(/^-/, '') === column.key;
  const descending = sort.startsWith('-');
  const next = current ? !descending : Boolean(column.largestFirst);
  return (
    <SortHeader
      label={column.label}
      className={cx(column.numeric && dataTable.numeric)}
      direction={current ? (descending ? 'desc' : 'asc') : undefined}
      onSort={() => onSort(`${next ? '-' : ''}${column.key}`)}
    />
  );
}
