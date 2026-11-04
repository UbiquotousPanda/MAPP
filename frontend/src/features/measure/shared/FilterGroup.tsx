import { useId, useState } from 'react';
import { Button } from '@/ui/Button/Button';
import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { SearchField } from '@/ui/SearchField/SearchField';
import { Disclosure } from './Disclosure';
import type { Ticked } from './filter-keys';
import styles from './ReportFrame.module.css';

export interface GroupOption {
  id: string;
  label: string;
}

interface FilterGroupProps {
  groupKey: string;
  title: string;
  options: GroupOption[];
  ticked: Ticked;
  /** Open before the viewer has folded it; a group that restricts, or needs a tick, opens anyway. */
  defaultOpen?: boolean;
  onChange: (ticked: Ticked) => void;
}

const SEARCH_ABOVE = 10;
const ACTIONS_ABOVE = 4;
const FIRST = 5;

function summaryOf(options: GroupOption[], ticked: Ticked): string {
  if (ticked === null) {
    return 'All';
  }
  const one = ticked.length === 1 ? options.find((o) => o.id === ticked[0]) : undefined;
  return one ? one.label : `${ticked.length} of ${options.length}`;
}

/** One filter group: Select all and Clear all above four values, a search above ten, five values then See more. */
export function FilterGroup(props: FilterGroupProps) {
  const { groupKey, title, options, ticked, defaultOpen = false, onChange } = props;
  const [search, setSearch] = useState('');
  const [more, setMore] = useState(false);
  const id = useId();
  const isTicked = (value: string) => ticked === null || ticked.includes(value);
  const shown = options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()));
  const listed = more ? shown : shown.slice(0, FIRST);

  function toggle(value: string, checked: boolean) {
    const current = ticked ?? options.map((o) => o.id);
    const next = checked ? [...current, value] : current.filter((v) => v !== value);
    onChange(next.length === options.length ? null : next);
  }

  return (
    <Disclosure
      groupKey={groupKey}
      title={title}
      summary={summaryOf(options, ticked)}
      defaultOpen={defaultOpen || ticked !== null}
      forceOpen={ticked?.length === 0}
    >
      {options.length > ACTIONS_ABOVE && (
        <div className={styles.groupActions}>
          <Button type="button" size="sm" variant="tertiary" onClick={() => onChange(null)}>
            Select all
          </Button>
          <Button type="button" size="sm" variant="tertiary" onClick={() => onChange([])}>
            Clear all
          </Button>
        </div>
      )}
      {options.length > SEARCH_ABOVE && (
        <SearchField label={`Search ${title}`} value={search} onChange={setSearch} />
      )}
      <ul className={styles.values}>
        {listed.map((option) => (
          <li key={option.id}>
            <CheckboxField
              label={option.label}
              name={`${id}-${option.id}`}
              checked={isTicked(option.id)}
              onChange={(checked) => toggle(option.id, checked)}
            />
          </li>
        ))}
      </ul>
      {shown.length > FIRST && (
        <Button type="button" size="sm" variant="tertiary" onClick={() => setMore(!more)}>
          {more ? 'See less' : `See more (${shown.length - FIRST})`}
        </Button>
      )}
    </Disclosure>
  );
}
