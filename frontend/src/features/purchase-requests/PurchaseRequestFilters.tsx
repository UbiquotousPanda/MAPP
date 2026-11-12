import { useEffect, useEffectEvent, useState } from 'react';
import { DateField } from '@/ui/DateField/DateField';
import { FilterChips } from '@/ui/FilterChips/FilterChips';
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
  onChange: (patch: Partial<ListSearch>, replace?: boolean) => void;
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
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.search}>
          <DelayedSearch value={search.q} onChange={(q) => onChange({ q }, true)} />
        </div>
        <SegmentedFilter
          label="View"
          options={[
            { value: 'all', label: VIEW_ALL },
            { value: 'waiting', label: VIEW_WAITING },
          ]}
          value={search.waiting ? 'waiting' : 'all'}
          onChange={(view) => onChange({ waiting: view === 'waiting' })}
        />
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
        {total !== undefined && <ResultCount>{countText(total)}</ResultCount>}
      </div>
      <div className={styles.row}>
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
        <DateField
          compact
          label={FILTER_LABELS.from}
          value={search.from}
          onChange={(from) => onChange({ from })}
        />
        <DateField
          compact
          label={FILTER_LABELS.to}
          value={search.to}
          onChange={(to) => onChange({ to })}
        />
      </div>
      <FilterChips
        chips={chips}
        onRemove={(key) => onChange(withoutChip(search, key))}
        onClearAll={() => onChange(clearedListSearch(search))}
      />
    </div>
  );
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

/** Filters 300 ms after the last key; shows the address's search again when it changes elsewhere. */
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
      label={SEARCH_LABEL}
      placeholder={SEARCH_PLACEHOLDER}
      value={text}
      onChange={(next) => setDraft({ text: next, over: value })}
    />
  );
}
