import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { cx } from '../cx';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Adds the secondary "Reset filters" button, for a list the filters emptied. */
  onReset?: () => void;
  /** Icon, words and action on one row, for a card among others (Home). */
  compact?: boolean;
}

export function EmptyState({ icon, title, text, action, onReset, compact }: EmptyStateProps) {
  return (
    <div className={cx(styles.empty, compact && styles.compact)}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {text && <p className={styles.text}>{text}</p>}
      {(action || onReset) && (
        <div className={styles.action}>
          {action}
          {onReset && (
            <Button
              type="button"
              variant="secondary"
              size={compact ? 'sm' : 'md'}
              onClick={onReset}
            >
              Reset filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
