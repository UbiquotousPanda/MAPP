import type { ReactNode } from 'react';
import type { components } from '@/api/generated/schema';
import { DateRangeMenu } from '@/ui/DateRangeMenu/DateRangeMenu';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import type { FilterChoice } from '@/ui/FilterMenu/FilterMenu';
import { SearchField } from '@/ui/SearchField/SearchField';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { filterChips, removeFilter, typeLabel } from './filter-chips';
import { ACTION_FILTERS, DATE_RANGES, NO_FILTERS, customRangeError } from './log-filters';
import type { LogFilterState } from './log-filters';

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
  onChange: (filters: LogFilterState) => void;
  summary: ActivityLogSummary | undefined;
  record: RecordRef | null;
  count?: ReactNode;
}

/** How many filters behind Filters (n) are in use; the Record filter of a link counts too. */
function filtersInUse(filters: LogFilterState): number {
  const { person, type, actions, plan, record, range } = filters;
  return [person, type, actions.length > 0, plan, record, range].filter(Boolean).length;
}

export function LogFilterBar(props: LogFilterBarProps) {
  const { filters, onChange, summary, record } = props;
  const { date } = useFormatters();
  const people = summary?.people ?? [];
  const recordTypes = summary?.recordTypes ?? [];
  const plans = summary?.plans ?? [];
  const chips = filterChips(filters, { people, recordTypes, plans, record, formatDate: date });

  const set = (patch: Partial<LogFilterState>) => onChange({ ...filters, ...patch });
  const oneValue = (label: string, any: string, value: string, choices: FilterChoice[]) => ({
    label,
    multiple: false,
    choices: [{ value: '', label: any }, ...choices],
    selected: [value],
    summary: value ? (choices.find((c) => c.value === value)?.label ?? value) : undefined,
  });
  const range = DATE_RANGES.find((choice) => choice.value === filters.range);

  return (
    <FilterBar
      search={
        <SearchField
          size="sm"
          delay={SEARCH_DELAY_MS}
          label="Search name, ID or person"
          placeholder="Search name, ID or person"
          value={filters.q}
          onChange={(q) => set({ q })}
        />
      }
      inUse={filtersInUse(filters)}
      menus={
        <>
          <FilterMenu
            {...oneValue(
              'Person',
              'Anyone',
              filters.person,
              people.map((person) => ({ value: person.id, label: person.name })),
            )}
            onChange={([person = '']) => set({ person })}
          />
          <FilterMenu
            {...oneValue(
              'Record type',
              'Any type',
              filters.type,
              recordTypes.map((choice) => ({
                value: choice.type,
                label: typeLabel(choice.type, recordTypes),
              })),
            )}
            onChange={([type = '']) => set({ type })}
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
          <FilterMenu
            {...oneValue(
              'Plan',
              'Any plan',
              filters.plan,
              plans.map((plan) => ({ value: plan.id, label: plan.name })),
            )}
            onChange={([plan = '']) => set({ plan })}
          />
          <FilterMenu
            label="Date"
            multiple={false}
            choices={DATE_RANGES}
            selected={[filters.range]}
            summary={filters.range ? range?.label : undefined}
            onChange={([value]) => {
              const next = DATE_RANGES.find((choice) => choice.value === value)?.value ?? '';
              set(next === 'custom' ? { range: next } : { range: next, from: '', to: '' });
            }}
          />
          {filters.range === 'custom' && (
            <DateRangeMenu
              label="Dates"
              legend="Changed between"
              from={filters.from}
              to={filters.to}
              error={customRangeError(filters)}
              onChange={(from, to) => set({ from, to })}
            />
          )}
        </>
      }
      end={props.count}
      chips={chips}
      onRemoveChip={(key) => onChange(removeFilter(filters, key))}
      onClearFilters={() => onChange(NO_FILTERS)}
    />
  );
}
