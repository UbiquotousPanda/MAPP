import { useEffect, useEffectEvent, useState } from 'react';
import type { ReactNode } from 'react';
import type { components } from '@/api/generated/schema';
import { DateField } from '@/ui/DateField/DateField';
import { FilterChips } from '@/ui/FilterChips/FilterChips';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import { SearchField } from '@/ui/SearchField/SearchField';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Select } from '@/ui/Select/Select';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { filterChips, removeFilter, typeLabel } from './filter-chips';
import { ACTION_FILTERS, DATE_RANGES, NO_FILTERS, customRangeError } from './log-filters';
import type { DateRangeKey, LogFilterState } from './log-filters';
import styles from './LogFilterBar.module.css';

type ActivityLogSummary = components['schemas']['ActivityLogSummary'];
type RecordRef = components['schemas']['RecordRef'];

const ACTION_CHOICES = ACTION_FILTERS.map((choice) => ({
  value: choice.value,
  label: choice.word,
}));
// Kept in the menu's order, so the address and the chips do not depend on the clicks' order.
const ACTIONS = ACTION_FILTERS.map((choice) => choice.value);

export const SEARCH_DELAY_MS = 300;

export interface LogFilterBarProps {
  filters: LogFilterState;
  /** Applies new filters; `typing` is true for the search box, which should not add to history. */
  onChange: (filters: LogFilterState, typing?: boolean) => void;
  summary: ActivityLogSummary | undefined;
  record: RecordRef | null;
  count?: ReactNode;
}

export function LogFilterBar({ filters, onChange, summary, record, count }: LogFilterBarProps) {
  const { date } = useFormatters();
  const people = summary?.people ?? [];
  const recordTypes = summary?.recordTypes ?? [];
  const plans = summary?.plans ?? [];
  const rangeError = customRangeError(filters);
  const chips = filterChips(filters, { people, recordTypes, plans, record, formatDate: date });

  const set = (patch: Partial<LogFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className={styles.filters}>
      <div className={styles.row}>
        <div className={styles.search}>
          <DelayedSearch value={filters.q} onChange={(q) => onChange({ ...filters, q }, true)} />
        </div>
        <Select
          label="Person"
          value={filters.person}
          onChange={(person) => set({ person })}
          options={[
            { value: '', label: 'Anyone' },
            ...withChosen(
              people.map((person) => ({ value: person.id, label: person.name })),
              filters.person,
            ),
          ]}
        />
        <Select
          label="Record type"
          value={filters.type}
          onChange={(type) => set({ type })}
          options={[
            { value: '', label: 'Any type' },
            ...withChosen(
              recordTypes.map((choice) => ({
                value: choice.type,
                label: typeLabel(choice.type, recordTypes),
              })),
              filters.type,
            ),
          ]}
        />
        <FilterMenu
          label="Action"
          multiple
          choices={ACTION_CHOICES}
          selected={filters.actions}
          summary={filters.actions.length > 0 ? formatWhole(filters.actions.length) : undefined}
          onChange={(chosen) =>
            set({ actions: ACTIONS.filter((action) => chosen.includes(action)) })
          }
        />
        <Select
          label="Plan"
          value={filters.plan}
          onChange={(plan) => set({ plan })}
          options={[
            { value: '', label: 'Any plan' },
            ...withChosen(
              plans.map((plan) => ({ value: plan.id, label: plan.name })),
              filters.plan,
            ),
          ]}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.date}>
          <span className={styles.dateLabel} aria-hidden="true">
            Date
          </span>
          <SegmentedFilter<DateRangeKey | ''>
            label="Date"
            options={DATE_RANGES}
            value={filters.range}
            onChange={(range) => set(range === 'custom' ? { range } : { range, from: '', to: '' })}
          />
        </div>
        {filters.range === 'custom' && (
          <div className={styles.dates}>
            <DateField
              label="From"
              compact
              value={filters.from}
              onChange={(from) => set({ from })}
            />
            <DateField
              label="To"
              compact
              value={filters.to}
              min={filters.from || undefined}
              error={rangeError}
              onChange={(to) => set({ to })}
            />
          </div>
        )}
        {count}
      </div>

      <FilterChips
        chips={chips}
        onRemove={(key) => onChange(removeFilter(filters, key))}
        onClearAll={() => onChange(NO_FILTERS)}
      />
    </div>
  );
}

interface Option {
  value: string;
  label: string;
}

function withChosen(options: Option[], chosen: string): Option[] {
  return chosen && !options.some((option) => option.value === chosen)
    ? [...options, { value: chosen, label: chosen }]
    : options;
}

/** Filters 300 ms after the last key; shows the address's search when it changes elsewhere. */
function DelayedSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [draft, setDraft] = useState<{ text: string; over: string } | null>(null);
  const text = draft && draft.over === value ? draft.text : value;
  const apply = useEffectEvent((q: string) => onChange(q));

  useEffect(() => {
    if (!draft || draft.over !== value || draft.text === value) {
      return;
    }
    const timer = setTimeout(() => apply(draft.text), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, value]);

  return (
    <SearchField
      label="Search name, ID or person"
      placeholder="Search name, ID or person"
      value={text}
      onChange={(next) => setDraft({ text: next, over: value })}
    />
  );
}
