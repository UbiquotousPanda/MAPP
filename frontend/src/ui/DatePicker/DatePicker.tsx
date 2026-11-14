import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '../Button/Button';
import { Select } from '../Select/Select';
import { MONTH_NAMES, addMonths, isDate, isOutside } from './calendar';
import styles from './DatePicker.module.css';
import { DayGrid } from './DayGrid';

export interface DatePickerProps {
  /** "YYYY-MM-DD", or "" when none is chosen. */
  value: string;
  today: string;
  min?: string;
  max?: string;
  onChoose: (date: string) => void;
  onClear: () => void;
}

const YEARS_AROUND = 10;

/** The calendar of a date field (design system §5.5): a month of days, its header and footer. */
export function DatePicker({ value, today, min, max, onChoose, onClear }: DatePickerProps) {
  const { date } = useFormatters();
  const [active, setActive] = useState(() => startDay(value, today, min, max));
  const [focusGrid, setFocusGrid] = useState(true);
  const titleId = useId();
  const noteId = useId();
  const [year = 0, month = 1] = active.split('-').map(Number);
  const note = rangeNote(min && date(min), max && date(max));

  const show = (next: string) => {
    setFocusGrid(false);
    setActive(next);
  };
  const jump = (nextYear: number, nextMonth: number) =>
    show(addMonths(active, (nextYear - year) * 12 + nextMonth - month));

  return (
    <div className={styles.picker}>
      <div className={styles.header}>
        <Button
          size="sm"
          variant="tertiary"
          icon={<ChevronLeft />}
          aria-label="Previous month"
          onClick={() => show(addMonths(active, -1))}
        />
        <Select
          label="Month"
          hideLabel
          value={String(month)}
          options={MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name }))}
          onChange={(next) => jump(year, Number(next))}
        />
        <Select
          label="Year"
          hideLabel
          value={String(year)}
          options={yearsAround(year, min, max)}
          onChange={(next) => jump(Number(next), month)}
        />
        <Button
          size="sm"
          variant="tertiary"
          icon={<ChevronRight />}
          aria-label="Next month"
          onClick={() => show(addMonths(active, 1))}
        />
      </div>
      <p id={titleId} className="visually-hidden" aria-live="polite">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      <DayGrid
        active={active}
        value={value}
        today={today}
        min={min}
        max={max}
        labelledBy={titleId}
        describedBy={note ? noteId : undefined}
        focusActive={focusGrid}
        onMove={(next) => {
          setFocusGrid(true);
          setActive(next);
        }}
        onChoose={onChoose}
      />
      {note && (
        <p id={noteId} className={styles.note}>
          {note}
        </p>
      )}
      <div className={styles.footer}>
        <Button size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button size="sm" disabled={isOutside(today, min, max)} onClick={() => onChoose(today)}>
          Today
        </Button>
      </div>
    </div>
  );
}

function startDay(value: string, today: string, min?: string, max?: string): string {
  if (isDate(value)) {
    return value;
  }
  if (min && today < min) {
    return min;
  }
  return max && today > max ? max : today;
}

function rangeNote(from: string | undefined, to: string | undefined): string | undefined {
  if (from && to) {
    return `Choose a date from ${from} to ${to}.`;
  }
  if (from) {
    return `Choose a date from ${from} on.`;
  }
  return to ? `Choose a date up to ${to}.` : undefined;
}

function yearsAround(year: number, min?: string, max?: string) {
  const first = min ? Number(min.slice(0, 4)) : year - YEARS_AROUND;
  const last = max ? Number(max.slice(0, 4)) : year + YEARS_AROUND;
  return Array.from({ length: Math.max(last, year) - Math.min(first, year) + 1 }, (_, index) => {
    const option = String(Math.min(first, year) + index);
    return { value: option, label: option };
  });
}
