import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { formatWhole } from '@/format/decimal';
import { cx } from '../cx';
import { useSideScroll } from '../ScrollBox/useSideScroll';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './SegmentedFilter.module.css';

const EDGE_PX = 32;

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

function revealPressed(group: HTMLElement | null) {
  const pressed = group?.querySelector('[aria-pressed="true"]');
  if (!group || !pressed) {
    return;
  }
  const box = group.getBoundingClientRect();
  const pill = pressed.getBoundingClientRect();
  if (pill.left < box.left) {
    group.scrollLeft -= box.left - pill.left + EDGE_PX;
  } else if (pill.right > box.right) {
    group.scrollLeft += pill.right - box.right + EDGE_PX;
  }
}

export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFilterProps<T>) {
  const { ref, scroll } = useSideScroll<HTMLDivElement>();
  const group = useRef<HTMLDivElement | null>(null);
  const setGroup = useCallback(
    (element: HTMLDivElement | null) => {
      group.current = element;
      ref(element);
    },
    [ref],
  );
  useEffect(() => revealPressed(group.current), [value]);

  return (
    <div
      ref={setGroup}
      role="group"
      aria-label={label}
      className={cx(styles.group, scroll.start && styles.fadeStart, scroll.end && styles.fadeEnd)}
    >
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
