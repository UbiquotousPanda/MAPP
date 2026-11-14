import { History } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/ui/Avatar/Avatar';
import { LinkButton } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { RelativeTime } from '@/ui/RelativeTime/RelativeTime';
import { isPlanningType, recordHref } from '@/ui/record-links';
import { useHomeRecentChanges } from './api';
import type { ActivityLogEntry, HomeScope } from './api';
import { NO_RECENT_CHANGES, initialsOf, recentSentence } from './home-text';
import styles from './RecentChangesCard.module.css';
import { SectionError } from './SectionError';

/** The 10 newest activity-log entries about the plans in scope, each linking its record while it exists. */
export function RecentChangesCard({ scope }: { scope: HomeScope }) {
  const changes = useHomeRecentChanges(scope);

  return (
    <Card
      title="Recent changes"
      actions={
        <LinkButton size="sm" to="/activity-log">
          View activity log
        </LinkButton>
      }
    >
      {changes.isPending ? (
        <Skeleton lines={4} height="18px" />
      ) : changes.isError ? (
        <SectionError onRetry={() => void changes.refetch()} />
      ) : changes.data.items.length === 0 ? (
        <EmptyState compact icon={<History />} title={NO_RECENT_CHANGES} />
      ) : (
        <ul className={styles.entries}>
          {changes.data.items.map((entry) => (
            <RecentChange key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function hrefOf(entry: ActivityLogEntry): string | null {
  const now = entry.recordNow;
  if (now && now.state !== 'exists') {
    return null;
  }
  const type = entry.recordType;
  if (!isPlanningType(type)) {
    return null;
  }
  const planId = (now?.path ?? entry.path).find((ancestor) => ancestor.type === 'plan')?.id;
  if ((type === 'campaign' || type === 'initiative') && !planId) {
    return null;
  }
  return recordHref(type, entry.recordId, planId);
}

/** What follows the name of a record that no longer exists. */
const GONE: Partial<Record<string, string>> = {
  inRecycleBin: ' (in recycle bin)',
  deletedPermanently: ' (permanently deleted)',
};

function RecentChange({ entry }: { entry: ActivityLogEntry }) {
  const sentence = recentSentence(entry);
  const href = hrefOf(entry);

  return (
    <li className={styles.entry}>
      <Avatar initials={initialsOf(entry.actor.name)} size="sm" />
      <div className={styles.body}>
        <p className={styles.sentence}>
          {`${sentence.lead} `}
          {href ? (
            <Link to={href} className={styles.name}>
              {sentence.name}
            </Link>
          ) : (
            sentence.name
          )}{' '}
          <span className={styles.id}>· {sentence.id}</span>
          {GONE[entry.recordNow?.state ?? 'exists']}
        </p>
        <RelativeTime at={entry.at} />
      </div>
    </li>
  );
}
