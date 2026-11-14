import type { ReactNode } from 'react';
import { cx } from '@/ui/cx';
import styles from './ScrollBox.module.css';
import { useSideScroll } from './useSideScroll';

export interface ScrollBoxProps {
  label: string;
  children: ReactNode;
}

// Focusable only while it overflows, so the keyboard can scroll it (WCAG 2.1.1, design system §5.4).
export function ScrollBox({ label, children }: ScrollBoxProps) {
  const { ref, scroll } = useSideScroll<HTMLDivElement>();
  const overflows = scroll.start || scroll.end;

  return (
    <div className={cx(styles.frame, scroll.start && styles.cueStart, scroll.end && styles.cueEnd)}>
      <div
        ref={ref}
        className={styles.scroll}
        {...(overflows
          ? { role: 'region', 'aria-label': `${label}, scrolls sideways`, tabIndex: 0 }
          : {})}
      >
        {children}
      </div>
    </div>
  );
}
