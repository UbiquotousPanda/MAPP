import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import dataTable from '@/ui/Table/Table.module.css';
import { TotalLabel } from '@/ui/Table/TotalLabel';
import { cx } from '@/ui/cx';
import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import styles from './AllWorkGrid.module.css';
import { COLUMN_TIPS } from './all-work-text';
import type { AllWorkColumn, AllWorkResult, AllWorkRow, Sort } from './all-work-types';
import { CellValue } from './CellValue';
import { isNumeric } from './cell-text';
import { GridRow } from './GridRow';
import { PageSelectBox } from './SelectBox';
import type { GridSelection } from './SelectBox';
import type { VisibleRow } from './view-rows';
import selectStyles from './SelectBox.module.css';

export interface AllWorkGridProps {
  result: AllWorkResult;
  rows: VisibleRow[];
  continued: string;
  search: string;
  sort: Sort | null;
  onSort: (column: string) => void;
  onToggle: (key: string) => void;
  onOpen: (row: AllWorkRow) => void;
  selection?: GridSelection;
}

/**
 * The Grid (010 FR-011 – FR-017): Name, then the chosen columns; the rows of one page, each opening its
 * record, ticked for bulk actions with `selection` (012); the totals row closes every page.
 */
export function AllWorkGrid({
  result,
  rows,
  continued,
  search,
  sort,
  onSort,
  onToggle,
  onOpen,
  selection,
}: AllWorkGridProps) {
  const { columns, totals } = result;
  const statusInName = !columns.some((column) => column.key === 'status');

  return (
    <div className={styles.grid}>
      {continued && <p className={styles.continued}>Continued: {continued}</p>}
      <ScrollBox label="All work grid">
        <table className={cx(dataTable.table, styles.table)}>
          <caption className="visually-hidden">All work grid</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.nameHead}>
                <span className={selectStyles.headSelect}>
                  {selection && <PageSelectBox selection={selection} />}
                  Name
                </span>
              </th>
              {columns.map((column) => (
                <ColumnHeading key={column.key} column={column} sort={sort} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((visible) => (
              <GridRow
                key={visible.row.key}
                visible={visible}
                columns={columns}
                search={search}
                statusInName={statusInName}
                onToggle={onToggle}
                onOpen={onOpen}
                selection={selection}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className={dataTable.total}>
              <th scope="row" className={styles.nameCell}>
                <TotalLabel />
              </th>
              {columns.map((column, index) => (
                <td key={column.key} className={cx(isNumeric(column) && dataTable.numeric)}>
                  <CellValue cell={totals.cells[index]} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </ScrollBox>
    </div>
  );
}

interface ColumnHeadingProps {
  column: AllWorkColumn;
  sort: Sort | null;
  onSort: (column: string) => void;
}

/** A sortable heading sorts ascending, descending, then back to the plan-tree order (FR-015). */
function ColumnHeading({ column, sort, onSort }: ColumnHeadingProps) {
  const direction = sort?.column === column.key ? sort.direction : undefined;
  const tip = COLUMN_TIPS[column.key];
  const info = tip && <InfoTip label={column.label} text={tip} />;
  const className = cx(isNumeric(column) && dataTable.numeric);
  if (column.sortable) {
    return (
      <SortHeader
        label={column.label}
        direction={direction}
        onSort={() => onSort(column.key)}
        className={className}
        after={info}
      />
    );
  }
  return (
    <th scope="col" className={className}>
      {info ? (
        <span className={styles.headWithTip}>
          {column.label}
          {info}
        </span>
      ) : (
        column.label
      )}
    </th>
  );
}
