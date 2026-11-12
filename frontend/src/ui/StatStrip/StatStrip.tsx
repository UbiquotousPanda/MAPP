import type { ReactNode } from 'react';
import styles from './StatStrip.module.css';

export interface StatStripProps {
  label: string;
  id?: string;
  children: ReactNode;
}

/** SummaryCards joined into one bar: up to five in a row, more in two even rows, two per row when narrow. */
export function StatStrip({ label, id, children }: StatStripProps) {
  return (
    <div className={styles.frame}>
      <section id={id} className={styles.strip} aria-label={label}>
        {children}
      </section>
    </div>
  );
}
