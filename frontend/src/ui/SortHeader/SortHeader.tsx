import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './SortHeader.module.css';

export type SortDirection = 'asc' | 'desc';

export interface SortHeaderProps {
  label: string;
  /** The order the column is sorted in now; none when another column sorts. */
  direction?: SortDirection;
  onSort: () => void;
  className?: string;
  /** Shown after the button, such as an InfoTip. */
  after?: ReactNode;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

export function SortHeader({ label, direction, onSort, className, after }: SortHeaderProps) {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" className={className} aria-sort={direction ? ARIA_SORT[direction] : 'none'}>
      <span className={styles.head}>
        <button
          type="button"
          className={cx(styles.sort, direction && styles.sorted)}
          onClick={onSort}
        >
          {label}
          <Icon aria-hidden="true" className={styles.icon} />
        </button>
        {after}
      </span>
    </th>
  );
}
