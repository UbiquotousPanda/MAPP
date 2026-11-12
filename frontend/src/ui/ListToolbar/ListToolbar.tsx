import type { ReactNode } from 'react';
import { countText } from '../ResultCount/count-text';
import type { ListNoun } from '../ResultCount/count-text';
import { ResultCount } from '../ResultCount/ResultCount';
import { SearchField } from '../SearchField/SearchField';
import { SegmentedFilter } from '../SegmentedFilter/SegmentedFilter';
import styles from '../settings-table.module.css';
import type { StatusFilter } from '../useListFilters';

export interface ListToolbarProps {
  search: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
  };
  status?: {
    value: StatusFilter;
    onChange: (value: StatusFilter) => void;
    counts: Record<StatusFilter, number>;
  };
  filters?: ReactNode;
  count: { shown: number; total: number; noun: ListNoun };
}

/** The list toolbar of Settings, People and Teams (design system §5.2); it wraps when narrow. */
export function ListToolbar({ search, status, filters, count }: ListToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <SearchField
          label={search.label}
          placeholder={search.placeholder}
          value={search.value}
          onChange={search.onChange}
        />
      </div>
      {status && (
        <SegmentedFilter
          label="Status"
          options={[
            { value: 'active', label: 'Active', count: status.counts.active },
            { value: 'inactive', label: 'Inactive', count: status.counts.inactive },
            { value: 'all', label: 'All', count: status.counts.all },
          ]}
          value={status.value}
          onChange={status.onChange}
        />
      )}
      {filters}
      <ResultCount>{countText(count.shown, count.total, count.noun)}</ResultCount>
    </div>
  );
}
