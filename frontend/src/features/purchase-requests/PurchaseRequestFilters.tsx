import { DateRangeMenu } from '@/ui/DateRangeMenu/DateRangeMenu';
import { FilterBar } from '@/ui/FilterBar/FilterBar';
import { FilterMenu } from '@/ui/FilterMenu/FilterMenu';
import { ResultCount } from '@/ui/ResultCount/ResultCount';
import { SearchField } from '@/ui/SearchField/SearchField';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { Select } from '@/ui/Select/Select';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { listChips, withoutChip } from './list-filters';
import type { Choice } from './list-filters';
import {
  countText,
  FILTER_LABELS,
  NOT_COMPLETED,
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  SORT_WORDS,
  VIEW_ALL,
  VIEW_WAITING,
} from './list-text';
import { STATUS_WORDS } from './purchase-request-text';
import { clearedListSearch, LIST_SORTS } from './schemas';
import type { ListSearch } from './schemas';
import styles from './PurchaseRequestFilters.module.css';

const SEARCH_DELAY_MS = 300;
/** The "Not completed" choice: a value no option ID or trimmed vendor text can have. */
const NONE = ' none';

export interface PurchaseRequestFiltersProps {
  search: ListSearch;
  onChange: (patch: Partial<ListSearch>) => void;
  /** The matching purchase requests; undefined while they load. */
  total: number | undefined;
  types: Choice[];
  vendors: Choice[];
  owners: Choice[];
}

const STATUS_ORDER: ListSearch['status'] = [
  'created',
  'submitted',
  'inReview',
  'declined',
  'approved',
  'closed',
];
const SORT_OPTIONS = LIST_SORTS.map((sort) => ({ value: sort, label: SORT_WORDS[sort] }));
const STATUS_CHOICES: Choice[] = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_WORDS[value],
}));

/** With "Not completed" last, chosen when `none` is. */
function withNone(choices: Choice[], chosen: string[], none: boolean) {
  return {
    choices: [...choices, { value: NONE, label: NOT_COMPLETED }],
    chosen: none ? [...chosen, NONE] : chosen,
  };
}

/** Search, view, sort and the count, then the filters, then the chips (032 FR-045, FR-046). */
export function PurchaseRequestFilters(props: PurchaseRequestFiltersProps) {
  const { search, onChange, total } = props;
  const { date } = useFormatters();
  const types = withNone(props.types, search.type, search.typeNotCompleted);
  const vendors = withNone(
    withChosen(props.vendors, search.vendor),
    search.vendor,
    search.vendorNotCompleted,
  );
  const chips = listChips(search, { types: props.types, owners: props.owners, formatDate: date });

  return (
    <FilterBar
      className={styles.toolbar}
      search={
        <SearchField
          size="sm"
          delay={SEARCH_DELAY_MS}
          label={SEARCH_LABEL}
          placeholder={SEARCH_PLACEHOLDER}
          value={search.q}
          onChange={(q) => onChange({ q })}
        />
      }
      quick={
        <SegmentedFilter
          label="View"
          options={[
            { value: 'all', label: VIEW_ALL },
            { value: 'waiting', label: VIEW_WAITING },
          ]}
          value={search.waiting ? 'waiting' : 'all'}
          onChange={(view) => onChange({ waiting: view === 'waiting' })}
        />
      }
      inUse={filtersInUse(search)}
      menus={
        <>
          <CheckFilter
            label={FILTER_LABELS.status}
            choices={STATUS_CHOICES}
            chosen={search.status}
            onChange={(chosen) =>
              onChange({ status: STATUS_ORDER.filter((status) => chosen.includes(status)) })
            }
          />
          <CheckFilter
            label={FILTER_LABELS.type}
            choices={types.choices}
            chosen={types.chosen}
            onChange={(chosen) =>
              onChange({ type: without(chosen), typeNotCompleted: chosen.includes(NONE) })
            }
          />
          <CheckFilter
            label={FILTER_LABELS.vendor}
            choices={vendors.choices}
            chosen={vendors.chosen}
            onChange={(chosen) =>
              onChange({ vendor: without(chosen), vendorNotCompleted: chosen.includes(NONE) })
            }
          />
          <CheckFilter
            label={FILTER_LABELS.owner}
            choices={props.owners}
            chosen={search.owner}
            onChange={(owner) => onChange({ owner })}
          />
          <DateRangeMenu
            label={FILTER_LABELS.created}
            legend={FILTER_LABELS.createdBetween}
            from={search.from}
            to={search.to}
            onChange={(from, to) => onChange({ from, to })}
          />
        </>
      }
      end={
        <>
          {total !== undefined && <ResultCount>{countText(total)}</ResultCount>}
          <Select
            label="Sort"
            value={search.sort}
            options={SORT_OPTIONS}
            onChange={(value) => {
              const sort = LIST_SORTS.find((each) => each === value);
              if (sort) {
                onChange({ sort });
              }
            }}
          />
        </>
      }
      chips={chips}
      onRemoveChip={(key) => onChange(withoutChip(search, key))}
      onClearFilters={() => onChange({ ...clearedListSearch(search), q: search.q })}
    />
  );
}

/** How many filters behind Filters (n) are in use; "Not completed" counts with its filter. */
function filtersInUse(search: ListSearch): number {
  return [
    search.status.length > 0,
    search.type.length > 0 || search.typeNotCompleted,
    search.vendor.length > 0 || search.vendorNotCompleted,
    search.owner.length > 0,
    search.from !== '' || search.to !== '',
  ].filter(Boolean).length;
}

interface CheckFilterProps {
  label: string;
  choices: Choice[];
  chosen: string[];
  onChange: (chosen: string[]) => void;
}

/** Several values at once, kept in the choices' order so the address does not follow the clicks. */
function CheckFilter({ label, choices, chosen, onChange }: CheckFilterProps) {
  return (
    <FilterMenu
      label={label}
      multiple
      choices={choices}
      selected={chosen}
      summary={chosen.length > 0 ? formatWhole(chosen.length) : undefined}
      onChange={(next) => {
        const known = choices.map((choice) => choice.value).filter((each) => next.includes(each));
        onChange([...known, ...next.filter((each) => !known.includes(each))]);
      }}
    />
  );
}

function without(chosen: string[]): string[] {
  return chosen.filter((value) => value !== NONE);
}

/** The vendors on the page, plus chosen ones it does not list (an old link). */
function withChosen(choices: Choice[], chosen: string[]): Choice[] {
  const missing = chosen.filter((value) => !choices.some((choice) => choice.value === value));
  return [...choices, ...missing.map((value) => ({ value, label: value }))];
}
