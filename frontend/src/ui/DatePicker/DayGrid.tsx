import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { cx } from '../cx';
import { WEEKDAYS, WEEKDAY_NAMES, isOutside, keyTarget, longDate, monthWeeks } from './calendar';
import styles from './DatePicker.module.css';

export interface DayGridProps {
  /** The day that holds the focus; its month is the one shown. */
  active: string;
  value: string;
  today: string;
  min?: string;
  max?: string;
  labelledBy: string;
  describedBy?: string;
  /** True when the grid should take the focus after `active` changes (on opening and by keyboard). */
  focusActive: boolean;
  onMove: (date: string) => void;
  onChoose: (date: string) => void;
}

export function DayGrid(props: DayGridProps) {
  const { active, value, today, min, max, focusActive, onMove, onChoose } = props;
  const grid = useRef<HTMLTableElement>(null);
  const [year = 0, month = 1] = active.split('-').map(Number);

  useEffect(() => {
    if (focusActive) {
      grid.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus();
    }
  }, [active, focusActive]);

  function move(event: KeyboardEvent) {
    const next = keyTarget(event.key, event.shiftKey, active);
    if (next) {
      event.preventDefault();
      onMove(next);
    }
  }

  return (
    <table
      ref={grid}
      role="grid"
      className={styles.grid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      onKeyDown={move}
    >
      <thead>
        <tr>
          {WEEKDAYS.map((day, index) => (
            <th key={day} scope="col" abbr={WEEKDAY_NAMES[index]}>
              {day.slice(0, 2)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(year, month).map((week) => (
          <tr key={week.find(Boolean)}>
            {week.map((date, index) => {
              if (!date) {
                return <td key={`empty-${index}`} />;
              }
              const outside = isOutside(date, min, max);
              return (
                <td key={date} role="gridcell" aria-selected={date === value}>
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === active ? 0 : -1}
                    aria-label={outside ? `${longDate(date)}, not available` : longDate(date)}
                    aria-disabled={outside || undefined}
                    aria-current={date === today ? 'date' : undefined}
                    className={cx(
                      styles.day,
                      date === today && styles.today,
                      date === value && styles.chosen,
                    )}
                    onClick={() => !outside && onChoose(date)}
                  >
                    {Number(date.slice(8))}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
