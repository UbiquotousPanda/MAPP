import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { recordHref } from '@/ui/record-links';
import type { PlanningRecordType } from '@/ui/record-links';
import { cx } from '@/ui/cx';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import type { RankedColumn, RankedData, RankedEntryData } from './RankedList';
import styles from './RankedList.module.css';

const DRILLS_TO = new Set(['plan', 'campaign', 'initiative', 'activity']);

function isRecordType(level: string): level is PlanningRecordType {
  return DRILLS_TO.has(level) || level === 'lineItem';
}

interface TableProps<F> {
  data: RankedData<F>;
  columns: RankedColumn<F>[];
  sort: { sort: string; order: 'desc' | 'asc' };
  onSort: (key: string) => void;
  flag?: (figures: F) => string | undefined;
  owner: boolean;
  onDrill: (id: string) => void;
}

export function RankedTable<F>(props: TableProps<F>) {
  const { data, columns, sort, onSort, flag, owner, onDrill } = props;
  if (data.groups.length === 0) {
    return <p className={styles.note}>Nothing to rank on this page.</p>;
  }
  return (
    <div className={styles.tableWrap} data-focus-fallback tabIndex={-1}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.sticky}>
              Name
            </th>
            {owner && <th scope="col">Owner</th>}
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={styles.numeric}
                aria-sort={
                  c.key === sort.sort
                    ? sort.order === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {c.sortable === false ? (
                  c.label
                ) : (
                  <SortButton
                    label={c.label}
                    active={c.key === sort.sort}
                    order={sort.order}
                    onClick={() => onSort(c.key)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        {data.groups.map((g) => (
          <tbody key={g.key}>
            {g.label && (
              <tr className={styles.groupRow}>
                <th scope="rowgroup" className={styles.sticky}>
                  {g.label}
                </th>
                {owner && <td />}
                {columns.map((c) => (
                  <td key={c.key} className={styles.numeric}>
                    {c.value(g.totals)}
                  </td>
                ))}
              </tr>
            )}
            {g.entries.map((e) => (
              <Rows
                key={`${g.key}-${e.id}`}
                entry={e}
                columns={columns}
                flag={flag}
                owner={owner}
                onDrill={onDrill}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

interface RowsProps<F> {
  entry: RankedEntryData<F>;
  columns: RankedColumn<F>[];
  flag?: (figures: F) => string | undefined;
  owner: boolean;
  onDrill: (id: string) => void;
}

function Rows<F>({ entry, columns, flag, owner, onDrill }: RowsProps<F>) {
  const row = (e: RankedEntryData<F>, child: boolean) => {
    const word = flag?.(e.figures);
    const href = isRecordType(e.level) ? recordHref(e.level, e.id, e.planId) : undefined;
    return (
      <tr key={e.id} className={child ? styles.child : styles.top}>
        <th scope="row" className={styles.sticky}>
          <div className={styles.nameCell}>
            {child && DRILLS_TO.has(e.level) ? (
              <button
                type="button"
                className={styles.drill}
                title={`Show what is inside ${e.name}`}
                onClick={() => onDrill(e.id)}
              >
                {e.name}
                <ChevronRight aria-hidden="true" />
              </button>
            ) : (
              <span className={styles.name}>{e.name}</span>
            )}
            {href && (
              <Link
                className={styles.open}
                to={href}
                aria-label={`Open ${e.name} in Plan`}
                title={`Open ${e.name} in Plan`}
              >
                <ArrowUpRight aria-hidden="true" />
              </Link>
            )}
            {word && <StatusChip tone="problem">{word}</StatusChip>}
          </div>
        </th>
        {owner && <td>{e.owner?.name ?? '—'}</td>}
        {columns.map((c) => (
          <td key={c.key} className={styles.numeric}>
            <Cell column={c} entry={e} />
          </td>
        ))}
      </tr>
    );
  };
  return (
    <>
      {row(entry, false)}
      {entry.children?.map((child) => row(child, true))}
    </>
  );
}

/** An empty figure is a dash; its reason is in a tip and read out to screen readers. */
function Cell<F>({ column, entry }: { column: RankedColumn<F>; entry: RankedEntryData<F> }) {
  const why = column.empty?.(entry.figures);
  if (why && why !== '—') {
    return (
      <span title={why}>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">{why}</span>
      </span>
    );
  }
  return column.render ? column.render(entry.figures, entry) : column.value(entry.figures);
}

interface SortButtonProps {
  label: string;
  active: boolean;
  order: 'desc' | 'asc';
  onClick: () => void;
}

/** A column heading that sorts: high to low first, then low to high; the arrow shows which. */
function SortButton({ label, active, order, onClick }: SortButtonProps) {
  const Arrow = !active ? ArrowUpDown : order === 'desc' ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      className={cx(styles.sort, active && styles.sortActive)}
      onClick={onClick}
    >
      {label}
      <Arrow aria-hidden="true" />
    </button>
  );
}
