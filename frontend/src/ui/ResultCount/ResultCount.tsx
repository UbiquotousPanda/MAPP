import type { ReactNode } from 'react';
import styles from './ResultCount.module.css';

/** A list's result count at the end of its toolbar, read out when it changes (§5.2). */
export function ResultCount({ children }: { children: ReactNode }) {
  return (
    <p className={styles.count} aria-live="polite">
      {children}
    </p>
  );
}
