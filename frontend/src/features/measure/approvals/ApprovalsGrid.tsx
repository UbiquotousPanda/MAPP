import { useState } from 'react';
import { Link } from 'react-router';
import { formatMoneyText } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { Pager } from '@/ui/Pager/Pager';
import { SortHeader } from '@/ui/SortHeader/SortHeader';
import { nextSortOrder } from '@/ui/SortHeader/sort-order';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import dataTable from '@/ui/Table/Table.module.css';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { ApprovalsGridData, ApprovalsRowData } from './api';
import { CommentDialog } from './CommentDialog';
import { GridFilters } from './GridFilters';
import { PAGE_SIZES } from './schemas';
import type { ApprovalsParams, SortKey } from './schemas';
import { NOTHING, OUTCOME_TONES, OUTCOME_WORDS, oneRecordWord, waitingText } from './words';
import styles from './ApprovalsGrid.module.css';

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'itemId', label: 'Record ID' },
  { key: 'itemName', label: 'Record name' },
  { key: 'recordType', label: 'Record type' },
  { key: 'approver', label: 'Approver' },
  { key: 'decidedOn', label: 'Decided on' },
  { key: 'outcome', label: 'Status' },
  { key: 'submittedOn', label: 'Submitted on' },
  { key: 'level', label: 'Level', numeric: true },
  { key: 'purchaseOrder', label: 'Purchase order' },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'owner', label: 'Owner' },
  { key: 'comments', label: 'Comments' },
];

const TIP =
  'One row per named approver at each level of each submission. Others at a level read Not needed once ' +
  'someone decided. Amounts are the activity’s planned cost now, or the purchase request’s amount.';
const LONG_COMMENT = 60;
const NEEDS_FINANCE = 'You can’t see financial data for these plans, so amounts show —.';

export interface ApprovalsGridProps {
  grid?: ApprovalsGridData;
  covers?: { plans: number; of: number };
  params: ApprovalsParams;
  onParams: (changes: Partial<ApprovalsParams>) => void;
  failed?: boolean;
  onRetry?: () => void;
}

function financeNote(covers?: { plans: number; of: number }): string | undefined {
  if (!covers || covers.of === 0 || covers.plans === covers.of) {
    return undefined;
  }
  return covers.plans === 0
    ? NEEDS_FINANCE
    : `Amounts cover ${covers.plans} of ${covers.of} plans; the rest need financial data access.`;
}

function recordHref(row: ApprovalsRowData): string {
  return row.recordType === 'activity'
    ? `/activities/${row.itemId}`
    : `/purchase-requests/${row.itemId}`;
}

function SortHeading(props: {
  column: (typeof COLUMNS)[number];
  params: ApprovalsParams;
  onParams: ApprovalsGridProps['onParams'];
}) {
  const { column, params, onParams } = props;
  const current = params.sort === column.key;
  const sortBy = () => onParams({ sort: column.key, order: nextSortOrder(current, params.order) });
  return (
    <SortHeader
      label={column.label}
      className={column.numeric ? dataTable.numeric : undefined}
      direction={current ? params.order : undefined}
      onSort={sortBy}
    />
  );
}

interface RowProps {
  row: ApprovalsRowData;
  onRead: (row: ApprovalsRowData) => void;
  showOrder: boolean;
  today: string;
}

function Row({ row, onRead, showOrder, today }: RowProps) {
  const { date, money } = useFormatters();
  const long = row.comments.length > LONG_COMMENT;
  return (
    <tr>
      <td>{row.itemId}</td>
      <th scope="row" className={styles.name}>
        {row.canOpen ? <Link to={recordHref(row)}>{row.itemName}</Link> : row.itemName}
      </th>
      <td>{oneRecordWord(row.recordType)}</td>
      <td>{row.approver?.name ?? NOTHING}</td>
      <td>{row.decidedOn ? date(row.decidedOn) : NOTHING}</td>
      <td>
        <StatusChip tone={OUTCOME_TONES[row.outcome] ?? 'neutral'}>
          {row.outcome === 'waiting'
            ? waitingText(row.submittedOn, today)
            : (OUTCOME_WORDS[row.outcome] ?? row.outcome)}
        </StatusChip>
      </td>
      <td>{date(row.submittedOn)}</td>
      <td className={dataTable.numeric}>{row.level}</td>
      {showOrder && <td>{row.purchaseOrderNumber ?? NOTHING}</td>}
      <td className={dataTable.numeric}>{row.amount ? money(row.amount) : NOTHING}</td>
      <td>{row.owner.name}</td>
      <td className={styles.commentCell}>
        {row.comments === ''
          ? NOTHING
          : long
            ? `${row.comments.slice(0, LONG_COMMENT)}… `
            : row.comments}
        {long && (
          <Button type="button" size="sm" variant="tertiary" onClick={() => onRead(row)}>
            Read in full
          </Button>
        )}
      </td>
    </tr>
  );
}

function tableOf(grid: ApprovalsGridData): ReportTableData {
  return {
    columns: COLUMNS.map((c) => ({ label: c.label, numeric: c.numeric })),
    rows: grid.items.map((row, i) => ({
      key: `${row.itemId}-${row.level}-${i}`,
      cells: [
        row.itemId,
        row.itemName,
        oneRecordWord(row.recordType),
        row.approver?.name ?? NOTHING,
        row.decidedOn ?? NOTHING,
        OUTCOME_WORDS[row.outcome] ?? row.outcome,
        row.submittedOn,
        String(row.level),
        row.purchaseOrderNumber ?? NOTHING,
        row.amount ? formatMoneyText(row.amount) : NOTHING,
        row.owner.name,
        row.comments || NOTHING,
      ],
    })),
  };
}

function Empty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return filtered ? (
    <EmptyState compact title="Your filters exclude everything." onReset={onReset} />
  ) : (
    <EmptyState
      compact
      title="No approvals yet. Rows appear once a record is submitted for approval."
    />
  );
}

export function ApprovalsGrid({
  grid,
  covers,
  params,
  onParams,
  failed,
  onRetry,
}: ApprovalsGridProps) {
  const [reading, setReading] = useState<ApprovalsRowData | null>(null);
  const filtered = Boolean(
    params.q || params.recordTypes.length || params.approvers.length || params.outcomes.length,
  );
  const reset = () => onParams({ q: '', recordTypes: [], approvers: [], outcomes: [] });
  const note = financeNote(covers);
  const empty: ReportTableData = { columns: [{ label: 'Record ID' }], rows: [] };
  const showOrder = Boolean(grid?.items.some((row) => row.purchaseOrderNumber));
  const columns = COLUMNS.filter((c) => showOrder || c.key !== 'purchaseOrder');
  const today = new Date().toLocaleDateString('en-CA');
  return (
    <>
      <ReportWidget
        wide
        report="approvals"
        widget="approvals"
        title="Approvals"
        tip={TIP}
        note={note}
        loading={!grid && !failed}
        failed={failed}
        onRetry={onRetry}
        table={grid ? tableOf(grid) : empty}
        chart={
          grid && (
            <>
              <GridFilters choices={grid.choices} params={params} onChange={onParams} />
              {grid.total === 0 ? (
                <Empty filtered={filtered} onReset={reset} />
              ) : (
                <div className={cx(dataTable.scroll, styles.scroll)}>
                  <table className={cx(dataTable.table, styles.table)}>
                    <caption className="visually-hidden">
                      Approvals, one row per approver step
                    </caption>
                    <thead>
                      <tr>
                        {columns.map((c) => (
                          <SortHeading key={c.key} column={c} params={params} onParams={onParams} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.items.map((row, i) => (
                        <Row
                          key={`${row.itemId}-${row.level}-${i}`}
                          row={row}
                          onRead={setReading}
                          showOrder={showOrder}
                          today={today}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager
                placement="below"
                page={grid.page}
                pageSize={grid.pageSize}
                total={grid.total}
                sizes={PAGE_SIZES}
                onPage={(page) => onParams({ page })}
                onPageSize={(pageSize) => onParams({ pageSize })}
              />
            </>
          )
        }
      />
      <CommentDialog
        title={reading && `Comment on ${reading.itemName}`}
        comment={reading?.comments ?? ''}
        onClose={() => setReading(null)}
      />
    </>
  );
}
