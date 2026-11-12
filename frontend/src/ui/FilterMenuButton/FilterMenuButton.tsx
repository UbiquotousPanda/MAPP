import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
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
