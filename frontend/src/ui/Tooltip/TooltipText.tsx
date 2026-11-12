import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip';
import styles from './Tooltip.module.css';

export interface TooltipTextProps {
  tip: string;
  /** The name when the shown text alone would not say it (a dash, a clock time). */
  name?: string;
  children: ReactNode;
}

export function TooltipText({ tip, name, children }: TooltipTextProps) {
  return (
    <Tooltip content={tip}>
      <button type="button" className={styles.text} aria-label={name}>
        {children}
      </button>
    </Tooltip>
  );
}
