import { cx } from '../cx';
import type { StatusTone } from '../StatusChip/StatusChip';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './StatusDot.module.css';

export interface StatusDotProps {
  tone: StatusTone;
  label: string;
}

/** For rows a chip would crowd; the label ("Overdue · Start date passed") is its tooltip and its name. */
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
