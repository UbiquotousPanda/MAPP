import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './InlineAlert.module.css';

export type InlineAlertTone = 'info' | 'warning' | 'success' | 'danger';

const ICONS: Record<InlineAlertTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  danger: CircleAlert,
};

export interface InlineAlertProps {
  tone: InlineAlertTone;
  title?: string;
  children?: ReactNode;
  /** "alert" for a failure that must be read out at once; "status" otherwise. */
  role?: 'status' | 'alert';
  id?: string;
  /** Replaces the tone's icon where the words need another one (a clock for "waiting"). */
  icon?: LucideIcon;
}

export function InlineAlert({
  tone,
  title,
  children,
  role = 'status',
  id,
  icon,
}: InlineAlertProps) {
  const Icon = icon ?? ICONS[tone];
  return (
    <div id={id} role={role} data-tone={tone} className={cx(styles.alert, styles[tone])}>
      <Icon aria-hidden="true" className={styles.icon} />
      <div className={styles.text}>
        {title && <p className={styles.title}>{title}</p>}
        {children}
      </div>
    </div>
  );
}
