import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { forbiddenMessage } from '@/session/access';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { usePageTitle } from '@/ui/usePageTitle';
import tableStyles from '@/ui/settings-table.module.css';
import { usePerformanceSources } from '../api';
import { FilterBar } from '../filters/FilterBar';
import { useUrlFilters } from '../filters/useUrlFilters';
import type { UrlFilters } from '../filters/useUrlFilters';
import { PERFORMANCE_DATA } from '../performance-text';
import { useReviewRows } from './api';
import type { ReviewFilters, ReviewRow, ReviewStatus } from './api';
import { CorrectDialog } from './CorrectDialog';
import { DismissDialog } from './DismissDialog';
import {
  EMPTY_TEXT,
  EMPTY_TITLE,
  NO_HAND_ROWS,
  NO_MATCH,
  REASON_WORDS,
  reasonWord,
  REVIEW,
  REVIEW_DESCRIPTION,
  STATUS_TONES,
  STATUS_WORDS,
} from './review-text';
import { ReviewRowPanel } from './ReviewRowPanel';
import type { RowAction } from './ReviewRowPanel';

const FILTER_NAMES = ['key', 'status', 'reason', 'sourceId', 'importId', 'since', 'until'] as const;
const STATUSES: ReviewStatus[] = ['open', 'resolved', 'dismissed'];
const ANY_STATUS = 'any';

function reviewFiltersOf(values: UrlFilters['values']): ReviewFilters {
  const status =
    values.status === ANY_STATUS
      ? undefined
      : (STATUSES.find((s) => s === values.status) ?? 'open');
  return {
    status,
    key: values.key || undefined,
    reason: values.reason || undefined,
    sourceId: values.sourceId || undefined,
    importId: values.importId || undefined,
    since: values.since || undefined,
    until: values.until || undefined,
  };
}

/** Settings › Performance data › Rows to review: find a row, correct it, dismiss or reopen it. */
export function ReviewQueuePage() {
  usePageTitle(REVIEW);
  const filters = useUrlFilters(FILTER_NAMES);
  const rows = useReviewRows(reviewFiltersOf(filters.values));
  const sources = usePerformanceSources();
  const [params, setParams] = useSearchParams();
  const [action, setAction] = useState<RowAction | null>(null);
  const refused = forbiddenMessage(rows.error);
  if (refused) {
    return <NoAccess message={refused} />;
  }
  const openId = params.get('row') ?? '';
  const open = rows.data?.items.find((row) => row.id === openId);

  function openRow(id: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id) {
        next.set('row', id);
      } else {
        next.delete('row');
      }
      return next;
    });
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Settings', to: '/settings' },
          { label: PERFORMANCE_DATA, to: '/settings/performance-data' },
          { label: REVIEW },
        ]}
        title={REVIEW}
        description={REVIEW_DESCRIPTION}
      />
      <Card subtitle={NO_HAND_ROWS}>
        {rows.isError ? (
          <ErrorState error={rows.error} onRetry={() => void rows.refetch()} />
        ) : rows.data ? (
          <>
            <FilterBar
              search={{
                name: 'key',
                label: 'Search rows',
                placeholder: 'Search a key or any cell',
              }}
              selects={[
                {
                  name: 'status',
                  label: 'Status',
                  options: [
                    { value: '', label: STATUS_WORDS.open },
                    { value: 'resolved', label: STATUS_WORDS.resolved },
                    { value: 'dismissed', label: STATUS_WORDS.dismissed },
                    { value: ANY_STATUS, label: 'Any status' },
                  ],
                },
                {
                  name: 'reason',
                  label: 'Reason',
                  options: [
                    { value: '', label: 'Any reason' },
                    ...Object.entries(REASON_WORDS).map(([value, label]) => ({ value, label })),
                  ],
                },
                {
                  name: 'sourceId',
                  label: 'Data source',
                  options: [
                    { value: '', label: 'Every data source' },
                    ...(sources.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
                  ],
                },
              ]}
              filters={filters}
              count={rowCount(rows.data.items.length, filters.values.importId)}
            />
            <RowTable items={rows.data.items} filters={filters} onOpen={openRow} />
          </>
        ) : (
          <Skeleton lines={4} />
        )}
      </Card>
      {open && !action && (
        <ReviewRowPanel row={open} onAction={setAction} onClose={() => openRow('')} />
      )}
      {open && action === 'correct' && <CorrectDialog row={open} onClose={() => setAction(null)} />}
      {open && action === 'dismiss' && <DismissDialog row={open} onClose={() => setAction(null)} />}
    </>
  );
}

function rowCount(count: number, importId: string | undefined): string {
  const rows = `${formatWhole(count)} ${count === 1 ? 'row' : 'rows'}`;
  return importId ? `${rows} from import ${importId}` : rows;
}

interface RowTableProps {
  items: ReviewRow[];
  filters: UrlFilters;
  onOpen: (id: string) => void;
}

function RowTable({ items, filters, onOpen }: RowTableProps) {
  const { dateTime } = useFormatters();
  if (items.length === 0) {
    return filters.inUse ? (
      <div className={tableStyles.noMatch}>
        <p>{NO_MATCH}</p>
        <Button onClick={filters.clear}>Clear filters</Button>
      </div>
    ) : (
      <EmptyState icon={<ListChecks aria-hidden />} title={EMPTY_TITLE} text={EMPTY_TEXT} />
    );
  }
  return (
    <div className={tableStyles.tableScroll}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th scope="col">Reason</th>
            <th scope="col">Data source</th>
            <th scope="col">Row as loaded</th>
            <th scope="col">Received</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td className={tableStyles.nameCell}>
                <button
                  type="button"
                  className={tableStyles.nameButton}
                  onClick={() => onOpen(row.id)}
                >
                  {reasonWord(row.reason)}
                </button>
                <span className={tableStyles.secondLine}>{row.id}</span>
              </td>
              <td>{row.sourceName}</td>
              <td>
                {Object.entries(row.raw)
                  .map(([column, value]) => `${column}: ${value || '—'}`)
                  .join(' · ')}
              </td>
              <td className={tableStyles.nowrap}>{dateTime(row.createdAt)}</td>
              <td>
                <StatusChip tone={STATUS_TONES[row.status]}>{STATUS_WORDS[row.status]}</StatusChip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
