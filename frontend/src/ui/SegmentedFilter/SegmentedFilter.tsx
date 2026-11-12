import type { ReactNode } from 'react';
import { formatWhole } from '@/format/decimal';
import { cx } from '../cx';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './SegmentedFilter.module.css';

export interface SegmentedFilterOption<T extends string> {
  value: T;
  label: string;
  /** How many records the choice shows, written after the label ("Active 5"). */
  count?: number;
  /** Shows the icon alone; the label is then the button's name and its tooltip. */
  icon?: ReactNode;
}

export interface SegmentedFilterProps<T extends string> {
  label: string;
  options: SegmentedFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFilterProps<T>) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => {
        const pressed = option.value === value;
        const button = (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            aria-label={option.icon ? option.label : undefined}
            className={cx(
              styles.pill,
              pressed && styles.pressed,
              option.icon !== undefined && styles.icon,
            )}
            onClick={() => onChange(option.value)}
          >
            {option.icon ?? option.label}
            {option.count !== undefined && (
              <>
                {' '}
                <span className={styles.count}>{formatWhole(option.count)}</span>
              </>
            )}
          </button>
        );
        return option.icon ? (
          <Tooltip key={option.value} content={option.label}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
