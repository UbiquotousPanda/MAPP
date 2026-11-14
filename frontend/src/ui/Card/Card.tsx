import { useId } from 'react';
import type { ReactNode } from 'react';
import { SectionHeading } from '../SectionHeading/SectionHeading';
import styles from './Card.module.css';

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, actions, children }: CardProps) {
  const titleId = useId();
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <section className={styles.card} aria-labelledby={title ? titleId : undefined}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.heading}>
            {title && (
              <SectionHeading level={2} rank="card" id={titleId}>
                {title}
              </SectionHeading>
            )}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
