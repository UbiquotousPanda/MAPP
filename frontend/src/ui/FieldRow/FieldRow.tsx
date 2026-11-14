import type { ReactNode } from 'react';
import styles from './FieldRow.module.css';

export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.cells}>{children}</div>
    </div>
  );
}
