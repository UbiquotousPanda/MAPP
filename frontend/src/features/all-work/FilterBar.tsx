import { FilterBar as ListFilterBar } from '@/ui/FilterBar/FilterBar';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import type { FilterChoice } from '@/ui/FilterMenu/FilterMenu';
import { SearchField } from '@/ui/SearchField/SearchField';
import { YearRangeMenu } from '@/ui/YearRangeMenu/YearRangeMenu';
import { formatWhole } from '@/format/decimal';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { countText } from '@/ui/ResultCount/count-text';
import { AttributeFilterMenu } from '@/ui/AttributeFilterMenu/AttributeFilterMenu';
import styles from './FilterBar.module.css';
import {
  ACTIVITY_STATUS_LABELS,
  CONTAINER_STATUS_LABELS,
  countNoun,
  FILTER_LABELS,
  FINANCE_LABELS,
  isLabelled,
  MAX_YEARS,
  PLAN_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  SHOW_LEVELS_LABELS,
  STRATEGIC_LABELS,
  TOO_MANY_YEARS,
} from './all-work-text';
import type {
  AllWorkOptions,
  AllWorkResult,
  FilterValue,
  Filters,
  ViewState,
} from './all-work-types';
import { chipsOf, clearFilters, removeChip } from './view-chips';
import { choicesOf, withYears, yearRange } from './view-state';
import type { IdFilter, ValueFilter } from './view-state';

const SEARCH_DELAY_MS = 300;

const APPROVAL_PROGRESS = ['noActivities', 'inProgress', 'allApproved'];

export interface FilterBarProps {
  state: ViewState;
  options: AllWorkOptions | undefined;
  count: AllWorkResult['count'] | undefined;
  updating: boolean;
  onChange: (change: (current: ViewState) => ViewState) => void;
}

export function FilterBar({ state, options, count, updating, onChange }: FilterBarProps) {
  const { filters } = state;
  const setFilters = (change: Partial<Filters>) =>
    onChange((current) => ({ ...current, filters: { ...current.filters, ...change } }));

  function idMenu(filter: IdFilter) {
    const choices = choicesOf(filter, options);
    const chosen = filters[filter];
    return {
      label: FILTER_LABELS[filter],
      multiple: true,
      choices: choices.map((choice) => ({
        value: choice.id,
        label: choice.label,
        inactive: choice.inactive,
      })),
      selected: chosen.map((value) => value.id),
      summary: chosen.length > 0 ? formatWhole(chosen.length) : undefined,
      onChange: (ids: string[]) =>
        setFilters({
          [filter]: ids.map((id): FilterValue => ({
            id,
            label:
              choices.find((choice) => choice.id === id)?.label ??
              chosen.find((value) => value.id === id)?.label ??
              id,
          })),
        }),
    };
  }

  function valueMenu(
    filter: ValueFilter,
    labels: Record<string, string>,
    set: (values: string[]) => void,
    groupOf?: (value: string) => string,
  ) {
    const chosen: string[] = filters[filter] ?? [];
    return {
      label: FILTER_LABELS[filter],
      multiple: true,
      choices: Object.entries<string>(labels).map(([value, label]): FilterChoice => ({
        value,
        label,
        group: groupOf?.(value),
      })),
      selected: chosen,
      summary: chosen.length > 0 ? formatWhole(chosen.length) : undefined,
      onChange: set,
    };
  }

  const years = options ? options.years : [];
  const range = yearRange(state);
  const currencies = options?.planCurrencies ?? [];
  const menus = [
    idMenu('plans'),
    valueMenu('planStatuses', PLAN_STATUS_LABELS, (values) =>
      setFilters({ planStatuses: values.filter(isLabelled(PLAN_STATUS_LABELS)) }),
    ),
    valueMenu('planTypes', PLAN_TYPE_LABELS, (values) =>
      setFilters({ planTypes: values.filter(isLabelled(PLAN_TYPE_LABELS)) }),
    ),
    ...(currencies.length > 0 || (filters.planCurrencies?.length ?? 0) > 0
      ? [
          valueMenu(
            'planCurrencies',
            Object.fromEntries(currencies.map((code) => [code, code])),
            (planCurrencies) => setFilters({ planCurrencies }),
          ),
        ]
      : []),
    valueMenu(
      'containerStatuses',
      CONTAINER_STATUS_LABELS,
      (values) =>
        setFilters({ containerStatuses: values.filter(isLabelled(CONTAINER_STATUS_LABELS)) }),
      (value) => (APPROVAL_PROGRESS.includes(value) ? 'Approval progress' : 'Timing'),
    ),
    valueMenu('activityStatuses', ACTIVITY_STATUS_LABELS, (values) =>
      setFilters({ activityStatuses: values.filter(isLabelled(ACTIVITY_STATUS_LABELS)) }),
    ),
    idMenu('owners'),
    {
      ...idMenu('teams'),
      quickChoice: {
        label: 'My teams',
        values: (options?.teams ?? []).filter((team) => team.mine).map((team) => team.id),
      },
    },
    idMenu('businessUnits'),
    idMenu('activityTypes'),
    valueMenu('finance', FINANCE_LABELS, (values) =>
      setFilters({ finance: values.filter(isLabelled(FINANCE_LABELS)) }),
    ),
    {
      label: FILTER_LABELS.strategic,
      multiple: false,
      choices: Object.entries(STRATEGIC_LABELS).map(([value, label]) => ({ value, label })),
      selected: [filters.strategic],
      summary: filters.strategic === 'include' ? undefined : STRATEGIC_LABELS[filters.strategic],
      onChange: ([value = '']: string[]) => {
        if (isLabelled(STRATEGIC_LABELS)(value)) {
          setFilters({ strategic: value });
        }
      },
    },
    {
      label: FILTER_LABELS.bcpir,
      multiple: false,
      choices: Object.entries(STRATEGIC_LABELS).map(([value, label]) => ({ value, label })),
      selected: [filters.bcpir ?? 'include'],
      summary:
        filters.bcpir && filters.bcpir !== 'include' ? STRATEGIC_LABELS[filters.bcpir] : undefined,
      onChange: ([value = '']: string[]) => {
        if (isLabelled(STRATEGIC_LABELS)(value)) {
          setFilters({ bcpir: value });
        }
      },
    },
    {
      label: FILTER_LABELS.showLevels,
      multiple: false,
      choices: Object.entries(SHOW_LEVELS_LABELS).map(([value, label]) => ({ value, label })),
      selected: [filters.showLevels],
      summary:
        filters.showLevels === 'everything' ? undefined : SHOW_LEVELS_LABELS[filters.showLevels],
      onChange: ([value = '']: string[]) => {
        if (isLabelled(SHOW_LEVELS_LABELS)(value)) {
          setFilters({ showLevels: value });
        }
      },
    },
  ];

  const chips = chipsOf(state, options);
  const hasAttributes = Boolean(options?.attributes?.length) || Boolean(filters.attributes?.length);

  return (
    <ListFilterBar
      className={styles.bar}
      search={
        <SearchField
          size="sm"
          delay={SEARCH_DELAY_MS}
          label="Search"
          placeholder="Search name, ID or description"
          value={state.search}
          onChange={(search) => onChange((current) => ({ ...current, search }))}
        />
      }
      inUse={chips.length}
      menus={
        <>
          <YearRangeMenu
            legend="Plans of the years"
            years={years}
            from={range.from}
            to={range.to}
            maxYears={MAX_YEARS}
            note={TOO_MANY_YEARS}
            onChange={(from, to) =>
              onChange((current) => withYears(current, from ?? range.from, to ?? range.to))
            }
          />
          {menus.map((menu) => (
            <FilterMenu key={menu.label} {...menu} />
          ))}
          {hasAttributes && (
            <AttributeFilterMenu
              attributes={options?.attributes ?? []}
              selected={filters.attributes ?? []}
              onChange={(attributes) => setFilters({ attributes })}
            />
          )}
        </>
      }
      end={
        <ResultCount>
          {count && countText(count.shown, count.total, countNoun(count.noun))}
          {updating && <span className={styles.updating}> Updating…</span>}
        </ResultCount>
      }
      chips={chips}
      onRemoveChip={(key) => onChange((current) => removeChip(current, key))}
      onClearFilters={() => onChange(clearFilters)}
    />
  );
}
