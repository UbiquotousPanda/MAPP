import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import { YearRangeMenu } from '@/ui/YearRangeMenu/YearRangeMenu';
import { formatWhole } from '@/format/decimal';
import type { PlanListFilters } from './list-preferences';
import { PLAN_TYPE_LABELS, PLAN_TYPES } from './plan-currency';

export interface PlansFiltersProps {
  filters: PlanListFilters;
  years: number[];
  onChange: (next: Partial<PlanListFilters>) => void;
}

const SCOPES: Record<PlanListFilters['scope'], string> = {
  all: 'All plans',
  myTeams: 'My teams’ plans',
};

const BCPIR_CHOICES: Record<PlanListFilters['bcpir'], string> = {
  include: 'All plans',
  only: 'Only BCPIR plans',
  exclude: 'No BCPIR plans',
};

const TYPE_CHOICES = PLAN_TYPES.map((type) => ({ value: type, label: PLAN_TYPE_LABELS[type] }));

const choicesOf = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** The Plans list's filters behind Filters (n): Years, Plan type, Show and BCPIR plans. */
export function PlansFilters({ filters, years, onChange }: PlansFiltersProps) {
  return (
    <>
      <YearRangeMenu
        legend="Plans of the years"
        anyYear="All years"
        years={years}
        from={filters.yearFrom}
        to={filters.yearTo}
        onChange={(yearFrom, yearTo) => onChange({ yearFrom, yearTo })}
      />
      <FilterMenu
        label="Plan type"
        multiple
        choices={TYPE_CHOICES}
        selected={filters.types}
        summary={filters.types.length > 0 ? formatWhole(filters.types.length) : undefined}
        onChange={(types) => onChange({ types: PLAN_TYPES.filter((t) => types.includes(t)) })}
      />
      <FilterMenu
        label="Show"
        multiple={false}
        choices={choicesOf(SCOPES)}
        selected={[filters.scope]}
        summary={filters.scope === 'all' ? undefined : SCOPES[filters.scope]}
        onChange={([scope]) => onChange({ scope: scope === 'myTeams' ? 'myTeams' : 'all' })}
      />
      <FilterMenu
        label="BCPIR plans"
        multiple={false}
        choices={choicesOf(BCPIR_CHOICES)}
        selected={[filters.bcpir]}
        summary={filters.bcpir === 'include' ? undefined : BCPIR_CHOICES[filters.bcpir]}
        onChange={([bcpir]) =>
          onChange({ bcpir: bcpir === 'only' || bcpir === 'exclude' ? bcpir : 'include' })
        }
      />
    </>
  );
}
