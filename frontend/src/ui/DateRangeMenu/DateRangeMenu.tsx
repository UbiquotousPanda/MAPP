import { useFormatters } from '@/format/useFormatters';
import { DateField } from '../DateField/DateField';
import { FilterMenuButton } from '../FilterMenuButton/FilterMenuButton';
import { Popover } from '../Popover/Popover';
import styles from './DateRangeMenu.module.css';

export interface DateRangeMenuProps {
  label: string;
  legend: string;
  /** "YYYY-MM-DD", or "" when open-ended. */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Shown under To, and makes the button say nothing is applied. */
  error?: string;
}

/** A date-range filter of a filter bar (design system §5.2): From and To, each applied at once. */
export function DateRangeMenu({ label, legend, from, to, onChange, error }: DateRangeMenuProps) {
  const { date } = useFormatters();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <FilterMenuButton label={label} summary={error ? undefined : summaryOf(from, to, date)} />
      </Popover.Trigger>
      <Popover.Content width="md" padding="lg" aria-label={label}>
        <fieldset className={styles.fields}>
          <legend className={styles.legend}>{legend}</legend>
          <DateField
            compact
            label="From"
            value={from}
            max={to || undefined}
            onChange={(next) => onChange(next, to)}
          />
          <DateField
            compact
            label="To"
            value={to}
            min={from || undefined}
            error={error}
            onChange={(next) => onChange(from, next)}
          />
        </fieldset>
      </Popover.Content>
    </Popover.Root>
  );
}

function summaryOf(from: string, to: string, date: (day: string) => string): string | undefined {
  if (from && to) {
    return `${date(from)} – ${date(to)}`;
  }
  if (from) {
    return `from ${date(from)}`;
  }
  return to ? `to ${date(to)}` : undefined;
}
