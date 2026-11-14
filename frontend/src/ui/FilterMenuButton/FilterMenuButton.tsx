import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ComponentProps } from 'react';
import { formatWhole } from '@/format/decimal';
import { Button } from '../Button/Button';
import type { ButtonProps } from '../Button/Button';
import { cx } from '../cx';
import styles from './FilterMenuButton.module.css';

export interface FilterMenuButtonProps extends ComponentProps<'button'> {
  label: string;
  summary?: string;
}

/** One filter's button (design system §5.2): "Owner", and "Owner · 2" while in use. */
export function FilterMenuButton({ label, summary, className, ...props }: FilterMenuButtonProps) {
  return (
    <button
      type="button"
      className={cx(styles.button, summary && styles.inUse, className)}
      {...props}
    >
      {label}
      {summary && ' '}
      {summary && <span className={styles.summary}>· {summary}</span>}
      <ChevronDown aria-hidden="true" />
    </button>
  );
}

export interface FiltersButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'variant'> {
  /** How many filters are in use: "Filters (2)". */
  count: number;
}

/** The toolbar's "Filters (n)" button that opens the less-used filters; an icon and a badge on phones. */
export function FiltersButton({ count, className, size = 'sm', ...props }: FiltersButtonProps) {
  const number = formatWhole(count);
  return (
    <Button
      icon={<SlidersHorizontal />}
      size={size}
      className={cx(styles.filters, className)}
      {...props}
    >
      <span className={styles.word}>{count > 0 ? `Filters (${number})` : 'Filters'}</span>
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {number}
        </span>
      )}
    </Button>
  );
}
