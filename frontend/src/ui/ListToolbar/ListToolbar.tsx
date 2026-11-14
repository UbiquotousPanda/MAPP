import type { ReactNode } from 'react';
import { FilterBar } from '../FilterBar/FilterBar';
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
  };
  /** Further quick controls after the status, such as a "Show" `SegmentedFilter`. */
  filters?: ReactNode;
  count: { shown: number; total: number; noun: ListNoun };
}

/** The list toolbar of Settings, People and Teams (design system §5.2); it wraps when narrow. */
export function ListToolbar({ search, status, filters, count }: ListToolbarProps) {
  return (
    <FilterBar
      className={styles.listToolbar}
      search={
        <SearchField
          size="sm"
          label={search.label}
          placeholder={search.placeholder}
          value={search.value}
          onChange={search.onChange}
        />
      }
      quick={
        (status || filters) && (
          <>
            {status && (
              <SegmentedFilter
                label="Status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'all', label: 'All' },
                ]}
                value={status.value}
                onChange={status.onChange}
              />
            )}
            {filters}
          </>
        )
      }
      end={<ResultCount>{countText(count.shown, count.total, count.noun)}</ResultCount>}
    />
  );
}
