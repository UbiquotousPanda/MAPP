import { Children } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './StatStrip.module.css';

export interface StatStripProps {
  label: string;
  id?: string;
  children: ReactNode;
}

/** SummaryCards joined into one bar: up to five in a row, more in two even rows, two per row when narrow. */
export function StatStrip({ label, id, children }: StatStripProps) {
  const count = Children.toArray(children).length;
  const columns = count <= 5 ? count : Math.ceil(count / 2);
  const style: CSSProperties & { '--columns': number } = { '--columns': columns };
  return (
    <div className={styles.frame}>
      <section id={id} className={styles.strip} aria-label={label} style={style}>
        {children}
      </section>
    </div>
  );
}
