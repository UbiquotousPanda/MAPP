import { FilterMenuButton } from '@/ui/FilterMenuButton/FilterMenuButton';
import { Popover } from '@/ui/Popover/Popover';
import { Select } from '@/ui/Select/Select';
import { FILTER_LABELS, MAX_YEARS, TOO_MANY_YEARS, yearsText } from './all-work-text';
import styles from './YearRangeMenu.module.css';

export interface YearRangeMenuProps {
  years: number[];
  from: number;
  to: number;
  /** A new range; `to` is never before `from` nor more than five years after it. */
  onChange: (from: number, to: number) => void;
}

const yearOption = (year: number) => ({ value: String(year), label: String(year) });

// To offers only the years that keep the range within five; choosing a From moves To along.
export function YearRangeMenu({ years, from, to, onChange }: YearRangeMenuProps) {
  const label = FILTER_LABELS.years;
  // The chosen years stay offered, also when no plan has them (any more).
  const offered = [...new Set([...years, from, to])].sort((a, b) => a - b);
  const toChoices = offered.filter((year) => year >= from && year - from < MAX_YEARS);

  function chooseFrom(next: number) {
    const nextTo = to < next ? next : Math.min(to, next + MAX_YEARS - 1);
    onChange(next, nextTo);
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <FilterMenuButton label={label} summary={yearsText(from, to)} />
      </Popover.Trigger>
      <Popover.Content width="md" padding="lg" aria-label={label}>
        <fieldset className={styles.fields}>
          <legend className={styles.legend}>Plans of the years</legend>
          <Select
            label="From"
            value={String(from)}
            options={offered.map(yearOption)}
            onChange={(year) => chooseFrom(Number(year))}
          />
          <Select
            label="To"
            value={String(to)}
            options={toChoices.map(yearOption)}
            note={TOO_MANY_YEARS}
            onChange={(year) => onChange(from, Number(year))}
          />
        </fieldset>
      </Popover.Content>
    </Popover.Root>
  );
}
