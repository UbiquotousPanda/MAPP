import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './InlineError.module.css';

export interface InlineErrorProps {
  children: ReactNode;
  id?: string;
  /** A field's problem is heard with its field, so it is not announced again on its own. */
  quiet?: boolean;
}

export function InlineError({ children, id, quiet = false }: InlineErrorProps) {
  return (
    <p id={id} role={quiet ? undefined : 'alert'} className={styles.error}>
      <CircleAlert aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
