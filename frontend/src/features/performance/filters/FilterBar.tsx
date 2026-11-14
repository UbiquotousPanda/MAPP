import { DateRangeMenu } from '@/ui/DateRangeMenu/DateRangeMenu';
import { FilterBar as ListFilterBar } from '@/ui/FilterBar/FilterBar';
import type { FilterChip } from '@/ui/FilterChips/FilterChips';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { SearchField } from '@/ui/SearchField/SearchField';
import { useFormatters } from '@/format/useFormatters';
import styles from './filter-bar.module.css';
import type { UrlFilters } from './useUrlFilters';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  name: string;
  label: string;
  /** The first, '', is the default ("Any status"). */
  options: FilterOption[];
}

export interface FilterBarProps {
  search: { label: string; placeholder: string; name: string };
  selects: FilterSelect[];
  filters: UrlFilters;
  count: string;
}

/** Search, Filters (n) with the list's filters and a date range, and the count (design system §5.2). */
export function FilterBar({ search, selects, filters, count }: FilterBarProps) {
  const { values, set, setEach } = filters;
  const { date } = useFormatters();
  const since = values.since ?? '';
  const until = values.until ?? '';
  const chosen = selects.filter((select) => values[select.name]);
  const labelOf = (select: FilterSelect) =>
    select.options.find((option) => option.value === values[select.name])?.label ??
    values[select.name];
  const chips: FilterChip[] = [
    ...chosen.map((select) => ({ key: select.name, label: `${select.label}: ${labelOf(select)}` })),
    ...(since ? [{ key: 'since', label: `From: ${date(since)}` }] : []),
    ...(until ? [{ key: 'until', label: `To: ${date(until)}` }] : []),
  ];

  return (
    <ListFilterBar
      className={styles.bar}
      search={
        <SearchField
          size="sm"
          label={search.label}
          placeholder={search.placeholder}
          value={values[search.name] ?? ''}
          onChange={(value) => set(search.name, value)}
        />
      }
      inUse={chosen.length + (since || until ? 1 : 0)}
      menus={
        <>
          {selects.map((select) => (
            <FilterMenu
              key={select.name}
              label={select.label}
              multiple={false}
              choices={select.options}
              selected={[values[select.name] ?? '']}
              summary={values[select.name] ? labelOf(select) : undefined}
              onChange={([value = '']) => set(select.name, value)}
            />
          ))}
          <DateRangeMenu
            label="Dates"
            legend="Between"
            from={since}
            to={until}
            onChange={(from, to) => setEach({ since: from, until: to })}
          />
        </>
      }
      end={<ResultCount>{count}</ResultCount>}
      chips={chips}
      onRemoveChip={(key) => set(key, '')}
      onClearFilters={() => setEach(Object.fromEntries(chips.map((chip) => [chip.key, ''])))}
    />
  );
}
