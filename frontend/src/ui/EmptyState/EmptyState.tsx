import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Icon, words and action on one row, for a card among others (Home). */
  compact?: boolean;
}

/** What is missing and how to add it (design system §5). */
export function EmptyState({ icon, title, text, action, compact }: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, compact && styles.compact)}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {text && <p className={styles.text}>{text}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
