import { FilterMenuButton } from '../FilterMenuButton/FilterMenuButton';
import { Popover } from '../Popover/Popover';
import { Select } from '../Select/Select';
import styles from './YearRangeMenu.module.css';

export interface YearRangeMenuProps {
  legend: string;
  years: number[];
  from: number | null;
  to: number | null;
  onChange: (from: number | null, to: number | null) => void;
  /** The first From choice, which clears the range: "All years". */
  anyYear?: string;
  /** To offers only the years that keep the range within this many. */
  maxYears?: number;
  note?: string;
}

const yearOption = (year: number) => ({ value: String(year), label: String(year) });

function yearsText(from: number, to: number): string {
  return to > from ? `${from}–${to}` : String(from);
}

/** The Years filter of a filter bar (design system §5.2): From and To; choosing a From moves To along. */
export function YearRangeMenu(props: YearRangeMenuProps) {
  const { legend, years, from, to, onChange, anyYear, maxYears, note } = props;
  const label = 'Years';
  // The chosen years stay offered, also when no record has them (any more).
  const chosen = [from, to].filter((year) => year !== null);
  const offered = [...new Set([...years, ...chosen])].sort((a, b) => a - b);
  const toChoices = offered.filter(
    (year) => from !== null && year >= from && (maxYears === undefined || year - from < maxYears),
  );

  function chooseFrom(text: string) {
    if (text === '') {
      onChange(null, null);
      return;
    }
    const next = Number(text);
    const nextTo =
      to === null || to < next ? next : Math.min(to, next + (maxYears ?? Infinity) - 1);
    onChange(next, nextTo);
  }

  const fromOptions = offered.map(yearOption);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <FilterMenuButton
          label={label}
          summary={from !== null && to !== null ? yearsText(from, to) : undefined}
        />
      </Popover.Trigger>
      <Popover.Content width="md" padding="lg" aria-label={label}>
        <fieldset className={styles.fields}>
          <legend className={styles.legend}>{legend}</legend>
          <Select
            label="From"
            value={from === null ? '' : String(from)}
            options={anyYear ? [{ value: '', label: anyYear }, ...fromOptions] : fromOptions}
            onChange={chooseFrom}
          />
          {from !== null && (
            <Select
              label="To"
              value={to === null ? '' : String(to)}
              options={toChoices.map(yearOption)}
              note={note}
              onChange={(year) => onChange(from, Number(year))}
            />
          )}
        </fieldset>
      </Popover.Content>
    </Popover.Root>
  );
}
