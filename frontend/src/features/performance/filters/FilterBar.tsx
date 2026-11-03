import { SearchField } from '@/ui/SearchField/SearchField';
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
        <label key={select.name} className={styles.field}>
          {select.label}
          <select
            name={select.name}
            className={`${styles.control} ${styles.select}`}
            value={values[select.name] ?? ''}
            onChange={(event) => set(select.name, event.target.value)}
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className={styles.field}>
        From
        <input
          type="date"
          name="since"
          className={styles.control}
          value={values.since ?? ''}
          onChange={(event) => set('since', event.target.value)}
        />
      </label>
      <label className={styles.field}>
        To
        <input
          type="date"
          name="until"
          className={styles.control}
          value={values.until ?? ''}
          onChange={(event) => set('until', event.target.value)}
        />
      </label>
      <p className={styles.count} role="status">
        {count}
      </p>
    </div>
  );
}
