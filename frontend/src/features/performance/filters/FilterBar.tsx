import { DateField } from '@/ui/DateField/DateField';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { SearchField } from '@/ui/SearchField/SearchField';
import { Select } from '@/ui/Select/Select';
import styles from './filter-bar.module.css';
import type { UrlFilters } from './useUrlFilters';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  name: string;
  label: string;
  options: FilterOption[];
}

export interface FilterBarProps {
  search: { label: string; placeholder: string; name: string };
  selects: FilterSelect[];
  filters: UrlFilters;
  count: string;
}

/** Search, the list's selects, a date range and the count, in one row that wraps. */
export function FilterBar({ search, selects, filters, count }: FilterBarProps) {
  const { values, set } = filters;
  return (
    <div className={styles.bar} role="search" aria-label="Filters">
      <div className={styles.search}>
        <SearchField
          label={search.label}
          placeholder={search.placeholder}
          value={values[search.name] ?? ''}
          onChange={(value) => set(search.name, value)}
        />
      </div>
      {selects.map((select) => (
        <Select
          key={select.name}
          label={select.label}
          value={values[select.name] ?? ''}
          options={select.options}
          onChange={(value) => set(select.name, value)}
        />
      ))}
      <DateField
        label="From"
        compact
        value={values.since ?? ''}
        onChange={(value) => set('since', value)}
      />
      <DateField
        label="To"
        compact
        value={values.until ?? ''}
        onChange={(value) => set('until', value)}
      />
      <ResultCount>{count}</ResultCount>
    </div>
  );
}
