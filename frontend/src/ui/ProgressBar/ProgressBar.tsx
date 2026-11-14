import { cx } from '../cx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** The percentage (125 for 125 %); null when there is nothing to measure (the caller says why). */
  value: number | null;
  label: string;
  tone?: 'problem';
  /** Work with no known end: the fill travels along the track. */
  busy?: boolean;
}

export function ProgressBar({ value, label, tone, busy = false }: ProgressBarProps) {
  const known = busy ? null : value;
  const shown = known === null ? 0 : Math.min(100, Math.max(0, known));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known === null ? undefined : shown}
      aria-valuetext={known === null ? undefined : `${known} %`}
      className={styles.track}
    >
      <div
        className={cx(styles.fill, tone === 'problem' && styles.problem, busy && styles.busy)}
        style={busy ? undefined : { width: `${shown}%` }}
      />
    </div>
  );
}
