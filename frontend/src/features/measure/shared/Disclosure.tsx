import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { useOpenGroup } from './open-groups';
import styles from './ReportFrame.module.css';

interface DisclosureProps {
  groupKey: string;
  title: string;
  /** What is chosen, at a glance: "All", "2 of 6", or the one value. */
  summary: string;
  defaultOpen: boolean;
  /** Kept open whatever the viewer chose, while the group needs attention. */
  forceOpen?: boolean;
  children: ReactNode;
}

/** A filter group that folds: a header button with its name, summary and chevron, then its content. */
export function Disclosure(props: DisclosureProps) {
  const { groupKey, title, summary, defaultOpen, forceOpen = false, children } = props;
  const [stored, setOpen] = useOpenGroup(groupKey, defaultOpen);
  const open = forceOpen || stored;
  const bodyId = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.groupName}>{title}</span>{' '}
          <span className={styles.summary}>{summary}</span>
          <ChevronDown className={styles.chevron} aria-hidden="true" />
        </button>
      </legend>
      <div id={bodyId} className={styles.groupBody} hidden={!open}>
        {children}
      </div>
    </fieldset>
  );
}
