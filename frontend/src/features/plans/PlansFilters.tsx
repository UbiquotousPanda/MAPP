import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';
import { Popover } from '@/ui/Popover/Popover';
import { Select } from '@/ui/Select/Select';
import type { PlanListFilters } from './list-preferences';
import { PLAN_TYPE_LABELS, PLAN_TYPES } from './plan-currency';
import styles from './PlansFilters.module.css';
import { BcpirChoice } from './BcpirChoice';

export interface PlansFiltersProps {
  filters: PlanListFilters;
  years: number[];
  served016?: boolean;
  onChange: (next: Partial<PlanListFilters>) => void;
}

const ALL_YEARS = { value: '', label: 'All years' };

const LAYOUTS = [
  ['cards', 'Cards'],
  ['table', 'Table'],
] as const;

function filtersInUse(filters: PlanListFilters): number {
  return (
    (filters.yearFrom !== null ? 1 : 0) +
    (filters.types.length > 0 ? 1 : 0) +
    (filters.scope !== 'all' ? 1 : 0) +
    (filters.bcpir !== 'include' ? 1 : 0)
  );
}

function yearChoices(years: number[], filters: PlanListFilters): number[] {
  const all = new Set(years);
  if (filters.yearFrom !== null) all.add(filters.yearFrom);
  if (filters.yearTo !== null) all.add(filters.yearTo);
  return [...all].sort((a, b) => a - b);
}

export function PlansFilters({ filters, years, served016 = true, onChange }: PlansFiltersProps) {
  const id = useId();
  const count = filtersInUse(filters);
  const yearOptions = yearChoices(years, filters).map((year) => ({
    value: String(year),
    label: String(year),
  }));
  const allYears = filters.yearFrom === null || filters.yearTo === null;

  function chooseFrom(text: string) {
    if (!text) {
      onChange({ yearFrom: null, yearTo: null });
      return;
    }
    const from = Number(text);
    const to =
      !served016 || filters.yearTo === null || filters.yearTo < from ? from : filters.yearTo;
    onChange({ yearFrom: from, yearTo: to });
  }

  function chooseTo(text: string) {
    const to = Number(text);
    const from = filters.yearFrom === null || filters.yearFrom > to ? to : filters.yearFrom;
    onChange({ yearFrom: from, yearTo: to });
  }

  function toggleType(type: (typeof PLAN_TYPES)[number], on: boolean) {
    const chosen = new Set(filters.types);
    if (on) chosen.add(type);
    else chosen.delete(type);
    onChange({ types: PLAN_TYPES.filter((each) => chosen.has(each)) });
  }

  return (
    <Popover.Root>
      <Popover.Trigger className={styles.trigger}>
        <SlidersHorizontal aria-hidden="true" />
        <span className={styles.word}>{count > 0 ? `Filters (${count})` : 'Filters'}</span>
        {count > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {count}
          </span>
        )}
        <ChevronDown aria-hidden="true" className={styles.chevron} />
      </Popover.Trigger>
      <Popover.Content width="md" padding="lg" className={styles.menu} aria-label="Filters">
        {!served016 ? (
          <div className={styles.field}>
            <Select
              label="Year"
              value={allYears ? '' : String(filters.yearFrom)}
              options={[ALL_YEARS, ...yearOptions]}
              onChange={chooseFrom}
            />
          </div>
        ) : (
          <fieldset className={styles.field}>
            <legend className={styles.label}>Years</legend>
            <Select
              label="From"
              value={allYears ? '' : String(filters.yearFrom)}
              options={[ALL_YEARS, ...yearOptions]}
              onChange={chooseFrom}
            />
            {!allYears && (
              <Select
                label="To"
                value={String(filters.yearTo)}
                options={yearOptions}
                onChange={chooseTo}
              />
            )}
          </fieldset>
        )}
        {served016 && (
          <fieldset className={styles.field}>
            <legend className={styles.label}>Plan type</legend>
            {PLAN_TYPES.map((type) => (
              <label key={type} className={styles.check}>
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={(event) => toggleType(type, event.target.checked)}
                />
                {PLAN_TYPE_LABELS[type]}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset className={styles.field}>
          <legend className={styles.label}>Show</legend>
          {(
            [
              ['all', 'All plans'],
              ['myTeams', 'My teams’ plans'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input
                type="radio"
                name={`${id}-scope`}
                value={value}
                checked={filters.scope === value}
                onChange={() => onChange({ scope: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <BcpirChoice name={`${id}-bcpir`} value={filters.bcpir} onChange={onChange} />
        <fieldset className={`${styles.field} ${styles.phoneOnly}`}>
          <legend className={styles.label}>Layout</legend>
          {LAYOUTS.map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input
                type="radio"
                name={`${id}-layout`}
                value={value}
                checked={filters.layout === value}
                onChange={() => onChange({ layout: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </Popover.Content>
    </Popover.Root>
  );
}
