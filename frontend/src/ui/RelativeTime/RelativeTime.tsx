import { formatTime } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { TooltipText } from '../Tooltip/TooltipText';
import styles from './RelativeTime.module.css';

export interface RelativeTimeProps {
  at: string;
  /** ago: "3 days ago"; clock: "14:05", for lists already grouped by day. */
  show?: 'ago' | 'clock';
}

export function RelativeTime({ at, show = 'ago' }: RelativeTimeProps) {
  const { dateTime, relativeTime } = useFormatters();
  const full = dateTime(at);
  const shown = show === 'ago' ? relativeTime(at) : formatTime(at);
  return (
    <span className={styles.time}>
      <TooltipText tip={full} name={show === 'ago' ? `${shown}, ${full}` : full}>
        <time dateTime={at}>{shown}</time>
      </TooltipText>
    </span>
  );
}
