import type { ReactNode } from 'react';
import styles from './Tag.module.css';

/** A fact about a record, not a status ("Strategic", "Default", "This activity"): an outlined tag. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}
