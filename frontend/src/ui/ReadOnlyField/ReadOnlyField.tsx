import type { ReactNode } from 'react';
import { InfoTip } from '../InfoTip/InfoTip';
import styles from './ReadOnlyField.module.css';

export interface ReadOnlyFieldProps {
  label: string;
  value: ReactNode;
  /** What the field is for, in the ⓘ beside the label. */
  tip?: string;
  /** Why it can't change, in the lock beside the value (design system §6.6). */
  lock?: string;
}

export function ReadOnlyField({ label, value, tip, lock }: ReadOnlyFieldProps) {
  return (
    <div className={styles.field}>
      <p className={styles.label}>
        {label}
        {tip && <InfoTip label={label} text={tip} />}
      </p>
      <p className={styles.value}>
        {value}
        {lock && <InfoTip kind="locked" label={label} text={lock} />}
      </p>
    </div>
  );
}
