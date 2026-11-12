import { cx } from '../cx';
import type { StatusTone } from '../StatusChip/StatusChip';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './StatusDot.module.css';

export interface StatusDotProps {
  tone: StatusTone;
  /** What the dot means here ("Overdue · Start date passed"): its tooltip and its name. */
  label: string;
}

/** A status as a coloured dot where a chip would crowd the row; its tooltip and name say what it means. */
export function StatusDot({ tone, label }: StatusDotProps) {
  return (
    <Tooltip content={label}>
      <button type="button" className={styles.target}>
        <span className={cx(styles.dot, styles[tone])} aria-hidden="true" />
        <span className="visually-hidden">{label}</span>
      </button>
    </Tooltip>
  );
}
