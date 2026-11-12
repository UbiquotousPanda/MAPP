import { TriangleAlert } from 'lucide-react';
import type { MouseEvent } from 'react';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { TotalLabel } from '@/ui/Table/TotalLabel';
import { cx } from '@/ui/cx';
import { useFormatters } from '@/format/useFormatters';
import dataTable from '@/ui/Table/Table.module.css';
import gridStyles from './AllWorkGrid.module.css';
import { monthsAboveText, NOT_PHASED, PHASED_BUDGET_ROW, totalText } from './all-work-text';
import type { AllWorkResult, AllWorkRow, Money } from './all-work-types';
import styles from './BudgetView.module.css';
import { isControl, NOTHING } from './cell-text';
import { RowName } from './RowName';
import { ScrollBox } from './ScrollBox';
import type { VisibleRow } from './view-rows';

const ZERO = /^-?0+(\.0+)?$/;

export interface BudgetViewProps {
  result: AllWorkResult;
  /** The rows of the page on screen. */
  rows: VisibleRow[];
  continued: string;
  search: string;
  onToggle: (key: string) => void;
  onOpen: (row: AllWorkRow) => void;
}

// Every amount comes from the API, already spread and added up; with Compare with phased
// budget a planned cost above its period's phased budget is red with a warning sign.
export function BudgetView({ result, rows, continued, search, onToggle, onOpen }: BudgetViewProps) {
  const { periods, totals, summary } = result;

  return (
    <div className={gridStyles.grid}>
      <p className={styles.note}>
        To change how a cost is spread, open its line item
        {summary.negativeBalanceCount > 0 && (
          <InfoTip
            label="months above planned cost"
            text={monthsAboveText(summary.negativeBalanceCount)}
          />
        )}
      </p>
      {continued && <p className={gridStyles.continued}>Continued: {continued}</p>}
      <ScrollBox label="Budget & cost">
        <table className={cx(dataTable.table, gridStyles.table)}>
          <caption className="visually-hidden">Budget & cost</caption>
          <thead>
            <tr>
              <th scope="col" className={gridStyles.nameHead}>
                Name
              </th>
              <th scope="col" className={dataTable.numeric}>
                Plan budget
              </th>
              {periods.map((period) => (
                <th key={period.key} scope="col" className={dataTable.numeric}>
                  {period.label}
                </th>
              ))}
              <th scope="col" className={dataTable.numeric}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((visible) => (
              <BudgetRows
                key={visible.row.key}
                visible={visible}
                periodCount={periods.length}
                search={search}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className={dataTable.total}>
              <th scope="row" className={gridStyles.nameCell}>
                <TotalLabel count={totalText(totals.activities)} />
              </th>
              <td className={dataTable.numeric}>
                <Amount value={totals.planBudget} />
              </td>
              {periods.map((period, index) => (
                <td key={period.key} className={dataTable.numeric}>
                  <Amount value={totals.periods?.[index]} />
                </td>
              ))}
              <td className={dataTable.numeric}>
                <Amount value={totals.total} />
              </td>
            </tr>
          </tfoot>
        </table>
      </ScrollBox>
    </div>
  );
}

interface BudgetRowProps {
  visible: VisibleRow;
  periodCount: number;
  search: string;
  onToggle: (key: string) => void;
  onOpen: (row: AllWorkRow) => void;
}

function BudgetRows(props: BudgetRowProps) {
  const { row } = props.visible;
  return (
    <>
      <BudgetRow {...props} />
      {row.phasedBudget && (
        <tr className={cx(gridStyles.row, styles.phasedRow)}>
          <th scope="row" className={cx(gridStyles.nameCell, gridStyles[row.level])}>
            <span className={styles.phasedName} style={{ paddingLeft: `${row.depth * 24 + 32}px` }}>
              {PHASED_BUDGET_ROW} <span className="visually-hidden">of {row.name}</span>
            </span>
          </th>
          <td className={dataTable.numeric} />
          {Array.from({ length: props.periodCount }, (_, index) => (
            <td key={index} className={dataTable.numeric}>
              {row.phasedBudget?.[index] ? (
                <Amount value={row.phasedBudget[index]} />
              ) : (
                <span className={styles.empty}>{NOT_PHASED}</span>
              )}
            </td>
          ))}
          <td className={dataTable.numeric} />
        </tr>
      )}
    </>
  );
}

function BudgetRow({ visible, periodCount, search, onToggle, onOpen }: BudgetRowProps) {
  const { money } = useFormatters();
  const { row } = visible;
  const over = new Set(row.overPeriods ?? []);
  const isContainer =
    row.level === 'plan' || row.level === 'campaign' || row.level === 'initiative';
  // A negative balance is not spread; the activity says so instead.
  const exceeded =
    row.level === 'activity' && row.balance?.amount.startsWith('-') ? row.balance : undefined;

  function openFromRow(event: MouseEvent<HTMLTableRowElement>) {
    if (!isControl(event.target)) {
      onOpen(row);
    }
  }

  return (
    <tr
      data-row-key={row.key}
      className={cx(
        gridStyles.row,
        row.role === 'context' && gridStyles.context,
        row.level === 'unassigned' && gridStyles.unassignedRow,
      )}
      onClick={openFromRow}
    >
      <th scope="row" className={cx(gridStyles.nameCell, gridStyles[row.level])}>
        <RowName visible={visible} search={search} showStatus onToggle={onToggle} onOpen={onOpen}>
          {exceeded && (
            <span className={styles.exceeded}>
              Line items exceed the planned cost by{' '}
              {money({ amount: exceeded.amount.slice(1), currency: exceeded.currency })}
            </span>
          )}
        </RowName>
      </th>
      <td className={dataTable.numeric}>{isContainer && <Amount value={row.budget ?? null} />}</td>
      {Array.from({ length: periodCount }, (_, index) => (
        <td key={index} className={dataTable.numeric}>
          <Amount value={row.periods?.[index]} abovePhased={over.has(index)} />
        </td>
      ))}
      <td className={dataTable.numeric}>
        <Amount value={row.total} />
      </td>
    </tr>
  );
}

interface AmountProps {
  value: Money | null | undefined;
  /** The planned cost is above the period's phased budget: red with a sign. */
  abovePhased?: boolean;
}

/** "—" when there is none or it is zero, red with a minus sign when negative, red with a sign above phased budget. */
function Amount({ value, abovePhased = false }: AmountProps) {
  const { money } = useFormatters();
  if (!value || ZERO.test(value.amount)) {
    return <span className={styles.empty}>{NOTHING}</span>;
  }
  return (
    <span
      className={cx(styles.amount, (value.amount.startsWith('-') || abovePhased) && styles.problem)}
    >
      {abovePhased && <TriangleAlert aria-hidden="true" className={styles.overIcon} />}
      {money(value)}
      {abovePhased && ' '}
      {abovePhased && <span className="visually-hidden">(above the phased budget)</span>}
    </span>
  );
}
