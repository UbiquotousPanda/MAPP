import { SearchX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { SearchField } from '@/ui/SearchField/SearchField';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { useAccess } from '@/session/access';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { countText } from '@/ui/ResultCount/count-text';
import { BinRow } from './BinRow';
import { EMPTY_BIN_TEXT, holdsRecord, ITEMS, matchSearch, typePills } from './bin-text';
import type { BinItem } from './bin-text';
import { EmptyBinDialog } from './EmptyBinDialog';
import { PurgeDialog } from './PurgeDialog';
import { useRecycleBin } from './api';
import { RestoreDialog } from './RestoreDialog';
import { highlightedRecordOf } from './schemas';
import styles from './RecycleBinPage.module.css';

type OpenDialog =
  | { kind: 'restore'; item: BinItem }
  | { kind: 'purge'; item: BinItem }
  | { kind: 'empty'; items: BinItem[] };

/**
 * The Recycle bin (feature 011, US1, US4, US5, FR-014 – FR-032): everything deleted, newest
 * first, with search over each entry's contents and type pills (in the browser), **Restore**,
 * **Delete permanently** and **Empty recycle bin**. A link from the activity log (`?record=`)
 * highlights the row that holds the record.
 */
export function RecycleBinPage() {
  usePageTitle('Recycle bin');
  const bin = useRecycleBin();
  // Emptying the bin deletes for good: only for roles with recycleBin.purge (feature 014).
  const { has } = useAccess();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const type = params.get('type') ?? 'all';
  // Written in place, so Back leaves the page instead of undoing the filters one by one.
  const setFilters = (changes: { q?: string; type?: string }) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [name, value] of Object.entries(changes)) {
          if (value === '' || (name === 'type' && value === 'all')) {
            next.delete(name);
          } else {
            next.set(name, value);
          }
        }
        return next;
      },
      { replace: true },
    );
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const items = bin.data?.items ?? [];
  const closeDialog = () => setDialog(null);

  return (
    <>
      <PageHeader
        title="Recycle bin"
        // Destructive and rare: in More, never a red button on the page (design system §5.1).
        moreActions={
          items.length > 0 && has('recycleBin.purge')
            ? [
                {
                  label: 'Empty recycle bin',
                  tone: 'danger',
                  onSelect: () => setDialog({ kind: 'empty', items }),
                },
              ]
            : undefined
        }
      />
      {bin.error ? (
        <ErrorState error={bin.error} onRetry={() => void bin.refetch()} />
      ) : !bin.data ? (
        <div className={styles.panel}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.skeletonRow}>
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.panel}>
          <EmptyState icon={<Trash2 />} title="Nothing in the recycle bin" text={EMPTY_BIN_TEXT} />
        </div>
      ) : (
        <BinList
          items={items}
          search={search}
          onSearch={(q) => setFilters({ q })}
          type={type}
          onType={(value) => setFilters({ type: value })}
          onClear={() => setFilters({ q: '', type: 'all' })}
          highlight={highlightedRecordOf(params)}
          onRestore={(item) => setDialog({ kind: 'restore', item })}
          onPurge={(item) => setDialog({ kind: 'purge', item })}
        />
      )}

      {dialog?.kind === 'restore' && (
        <RestoreDialog
          item={dialog.item}
          onClose={closeDialog}
          onPurge={(item) => setDialog({ kind: 'purge', item })}
        />
      )}
      {dialog?.kind === 'purge' && <PurgeDialog item={dialog.item} onClose={closeDialog} />}
      {dialog?.kind === 'empty' && <EmptyBinDialog items={dialog.items} onClose={closeDialog} />}
    </>
  );
}

interface BinListProps {
  items: BinItem[];
  search: string;
  onSearch: (search: string) => void;
  type: string;
  onType: (type: string) => void;
  onClear: () => void;
  highlight: string;
  onRestore: (item: BinItem) => void;
  onPurge: (item: BinItem) => void;
}

function BinList({
  items,
  search,
  onSearch,
  type,
  onType,
  onClear,
  highlight,
  onRestore,
  onPurge,
}: BinListProps) {
  const shown = items
    .filter((item) => type === 'all' || item.recordType === type)
    .map((item) => ({ item, match: matchSearch(item, search) }))
    .filter(({ match }) => match.matches);
  const highlighted = highlight ? items.find((item) => holdsRecord(item, highlight)) : undefined;

  return (
    <div className={styles.panel}>
      <FilterBar
        className={styles.toolbar}
        search={
          <SearchField
            size="sm"
            label="Search name or ID"
            placeholder="Search name or ID"
            value={search}
            onChange={onSearch}
          />
        }
        quick={
          <SegmentedFilter
            label="Record type"
            options={typePills(items)}
            value={type}
            onChange={onType}
          />
        }
        end={<ResultCount>{countText(shown.length, items.length, ITEMS)}</ResultCount>}
      />
      {highlight && !highlighted && (
        <p className={styles.notice} role="status">
          That item is no longer in the recycle bin.
        </p>
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Nothing matches these filters"
          text="Remove a filter or search for something else."
          action={<Button onClick={onClear}>Clear filters</Button>}
        />
      ) : (
        <ul role="list" className={styles.rows}>
          {shown.map(({ item, match }) => (
            <BinRow
              key={item.id}
              item={item}
              containsText={match.containsText}
              highlighted={item === highlighted}
              highlightInside={item === highlighted && item.recordId !== highlight}
              onRestore={() => onRestore(item)}
              onPurge={() => onPurge(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
