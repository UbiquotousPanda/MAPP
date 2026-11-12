import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '@/ui/Avatar/Avatar';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { RelativeTime } from '@/ui/RelativeTime/RelativeTime';
import {
  ACTION_CHIPS,
  detailLines,
  initialsOf,
  pathText,
  recordLink,
  sentenceLead,
} from './log-text';
import type { ActivityLogEntry } from './log-text';
import styles from './LogEntry.module.css';

export interface LogEntryProps {
  entry: ActivityLogEntry;
}

export function LogEntry({ entry }: LogEntryProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const chip = ACTION_CHIPS[entry.action];
  const details = detailLines(entry);
  const place = pathText(entry.path);

  return (
    <li className={styles.entry}>
      <Avatar initials={initialsOf(entry.actor.name)} size="sm" />
      <div className={styles.body}>
        <p className={styles.sentence}>
          {sentenceLead(entry)}
          {entry.action !== 'emptiedRecycleBin' && (
            <>
              {' '}
              <RecordName entry={entry} />
              <span className={styles.id}>{entry.recordId}</span>
            </>
          )}
        </p>
        {place && <p className={styles.meta}>{place}</p>}
        {details.length > 0 && (
          <>
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen(!open)}
            >
              {open ? 'Hide details' : 'Show details'}
            </button>
            <ul id={detailsId} className={styles.details} hidden={!open}>
              {details.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className={styles.side}>
        <RelativeTime at={entry.at} show="clock" />
        <StatusChip tone={chip.tone}>{chip.word}</StatusChip>
      </div>
    </li>
  );
}

function RecordName({ entry }: { entry: ActivityLogEntry }) {
  const link = recordLink(entry);
  switch (link.kind) {
    case 'record':
      return (
        <>
          &apos;
          <Link className={styles.link} to={link.href}>
            {entry.recordName}
          </Link>
          &apos;{link.now}
        </>
      );
    case 'recycleBin':
      return (
        <>
          &apos;
          <Link className={styles.link} to={link.href}>
            {entry.recordName}
          </Link>
          &apos; (in the recycle bin)
        </>
      );
    case 'text':
      return (
        <>
          <span className={styles.name}>&apos;{entry.recordName}&apos;</span>
          {link.suffix}
        </>
      );
  }
}
