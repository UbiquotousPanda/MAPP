import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { recordHref } from '@/ui/record-links';
import type { PlanningRecordType } from '@/ui/record-links';
import { cx } from '@/ui/cx';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import dataTable from '@/ui/Table/Table.module.css';
import { TotalLabel } from '@/ui/Table/TotalLabel';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { TooltipText } from '@/ui/Tooltip/TooltipText';
import type { RankedColumn, RankedData, RankedEntryData } from './RankedList';
import styles from './RankedList.module.css';

const NAME = cx(dataTable.sticky, styles.nameColumn);
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
    <div className={cx(dataTable.scroll, styles.tableWrap)} data-focus-fallback tabIndex={-1}>
      <table className={cx(dataTable.table, styles.table)}>
        <thead>
          <tr>
            <th scope="col" className={NAME}>
              Name
            </th>
            {owner && <th scope="col">Owner</th>}
            {columns.map((c) =>
              c.sortable === false ? (
                <th key={c.key} scope="col" className={dataTable.numeric}>
                  {c.label}
                </th>
              ) : (
                <SortHeader
                  key={c.key}
                  label={c.label}
                  className={dataTable.numeric}
                  direction={c.key === sort.sort ? sort.order : undefined}
                  onSort={() => onSort(c.key)}
                />
              ),
            )}
          </tr>
        </thead>
        {data.groups.map((g) => (
          <tbody key={g.key}>
            {g.label && (
              <tr className={styles.groupRow}>
                <th scope="rowgroup" className={NAME}>
                  {g.label}
                </th>
                {owner && <td />}
                {columns.map((c) => (
                  <td key={c.key} className={dataTable.numeric}>
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
        <tfoot>
          <tr className={dataTable.total}>
            <th scope="row" className={NAME}>
              <TotalLabel />
            </th>
            {owner && <td />}
            {columns.map((c) => (
              <td key={c.key} className={dataTable.numeric}>
                {c.value(data.totals)}
              </td>
            ))}
          </tr>
        </tfoot>
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
        <th scope="row" className={NAME}>
          <div className={styles.nameCell}>
            {child && DRILLS_TO.has(e.level) ? (
              <Tooltip content={`Show what is inside ${e.name}`}>
                <button type="button" className={styles.drill} onClick={() => onDrill(e.id)}>
                  {e.name}
                  <ChevronRight aria-hidden="true" />
                </button>
              </Tooltip>
            ) : (
              <span className={styles.name}>{e.name}</span>
            )}
            {href && (
              <Tooltip content={`Open ${e.name} in Plan`}>
                <Link className={styles.open} to={href} aria-label={`Open ${e.name} in Plan`}>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Tooltip>
            )}
            {word && <StatusChip tone="problem">{word}</StatusChip>}
          </div>
        </th>
        {owner && <td>{e.owner?.name ?? '—'}</td>}
        {columns.map((c) => (
          <td key={c.key} className={dataTable.numeric}>
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
      <TooltipText tip={why} name={why}>
        —
      </TooltipText>
    );
  }
  return column.render ? column.render(entry.figures, entry) : column.value(entry.figures);
}
