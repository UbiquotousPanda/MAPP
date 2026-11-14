import type { ReactNode } from 'react';
import { formatWhole } from '@/format/decimal';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import type { FilterChoice } from '@/ui/FilterMenu/FilterMenu';

export interface GridFilter<K extends string> {
  key: K;
  label: string;
  choices: FilterChoice[];
}

export interface GridFilterBarProps<K extends string> {
  search: ReactNode;
  filters: GridFilter<K>[];
  selected: Record<K, string[]>;
  onChange: (changes: Partial<Record<K, string[]>>) => void;
  end?: ReactNode;
  className?: string;
}

/** A report grid's toolbar: search · Filters (n) with a multiple-choice menu per filter, chips and Clear filters. */
export function GridFilterBar<K extends string>(props: GridFilterBarProps<K>) {
  const { filters, selected, onChange } = props;
  const patch = (key: K, values: string[]) => {
    const changes: Partial<Record<K, string[]>> = {};
    changes[key] = values;
    return changes;
  };
  const chips = filters.flatMap((f) =>
    selected[f.key].map((value) => ({
      key: `${f.key}:${value}`,
      label: `${f.label}: ${f.choices.find((c) => c.value === value)?.label ?? value}`,
    })),
  );
  const remove = (chip: string) => {
    const f = filters.find((each) => chip.startsWith(`${each.key}:`));
    if (f) {
      const value = chip.slice(f.key.length + 1);
      onChange(
        patch(
          f.key,
          selected[f.key].filter((v) => v !== value),
        ),
      );
    }
  };
  const cleared: Partial<Record<K, string[]>> = {};
  for (const f of filters) {
    cleared[f.key] = [];
  }
  return (
    <FilterBar
      className={props.className}
      search={props.search}
      inUse={filters.filter((f) => selected[f.key].length > 0).length}
      menus={filters.map((f) => (
        <FilterMenu
          key={f.key}
          label={f.label}
          multiple
          choices={f.choices}
          selected={selected[f.key]}
          summary={selected[f.key].length > 0 ? formatWhole(selected[f.key].length) : undefined}
          onChange={(values) => onChange(patch(f.key, values))}
        />
      ))}
      end={props.end}
      chips={chips}
      onRemoveChip={remove}
      onClearFilters={() => onChange(cleared)}
    />
  );
}
