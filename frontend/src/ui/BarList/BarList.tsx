import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cx } from '../cx';
import track from '../ProgressBar/ProgressBar.module.css';
import styles from './BarList.module.css';

export interface BarListItem {
  key: string;
  label: string;
  /** The figures in words: the bar alone never carries the value. */
  value: string;
  size: number;
  /** A chart token; the planned-cost blue when absent. */
  colour?: string;
  href?: string;
}

export interface BarListProps {
  label: string;
  items: BarListItem[];
  /** A full bar's size: 100 for shares; the largest item's when absent. */
  max?: number;
}

export function BarList({ label, items, max }: BarListProps) {
  const full = max ?? Math.max(1, ...items.map((item) => Math.abs(item.size)));
  const linked = items.some((item) => item.href);
  return (
    <ul className={cx(styles.list, linked && styles.linked)} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={cx(styles.row, item.href && styles.rowLink)}>
          {item.href ? (
            <Link to={item.href} className={styles.label}>
              {item.label}
            </Link>
          ) : (
            <span className={styles.label}>{item.label}</span>
          )}
          <span className={track.track} aria-hidden="true">
            <span
              className={cx(track.fill, styles.fill)}
              style={{
                width: `${String(Math.min(100, (Math.abs(item.size) / full) * 100))}%`,
                background: item.colour ?? 'var(--chart-planned)',
              }}
            />
          </span>
          <span className={styles.value}>{item.value}</span>
          {linked && (item.href ? <ChevronRight aria-hidden="true" /> : <span />)}
        </li>
      ))}
    </ul>
  );
}
