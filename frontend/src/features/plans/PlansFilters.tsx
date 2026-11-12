import { useId } from 'react';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { FiltersButton } from '@/ui/FilterMenuButton/FilterMenuButton';
import { Popover } from '@/ui/Popover/Popover';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
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
  { value: 'cards', label: 'Cards' },
  { value: 'table', label: 'Table' },
] as const;

const SCOPES = [
  { value: 'all', label: 'All plans' },
  { value: 'myTeams', label: 'My teams’ plans' },
] as const;

const TYPE_OPTIONS = PLAN_TYPES.map((type) => ({ id: type, label: PLAN_TYPE_LABELS[type] }));

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

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <FiltersButton count={count} />
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
          <ChoiceField
            label="Plan type"
            name={`${id}-types`}
            multiple
            options={TYPE_OPTIONS}
            value={filters.types}
            onChange={(types) => onChange({ types: PLAN_TYPES.filter((t) => types.includes(t)) })}
          />
        )}
        <RadioGroup
          label="Show"
          name={`${id}-scope`}
          options={[...SCOPES]}
          value={filters.scope}
          onChange={(scope) => onChange({ scope })}
        />
        <BcpirChoice name={`${id}-bcpir`} value={filters.bcpir} onChange={onChange} />
        <div className={styles.phoneOnly}>
          <RadioGroup
            label="Layout"
            name={`${id}-layout`}
            options={[...LAYOUTS]}
            value={filters.layout}
            onChange={(layout) => onChange({ layout })}
          />
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
