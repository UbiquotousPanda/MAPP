import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './DisclosureButton.module.css';

export interface DisclosureButtonProps {
  expanded: boolean;
  /** The whole accessible name, saying what it opens or closes: "Expand Spring campaign". */
  label: string;
  onClick: () => void;
  tabIndex?: number;
}

export function DisclosureButton({ expanded, label, onClick, tabIndex }: DisclosureButtonProps) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      className={styles.button}
      aria-expanded={expanded}
      aria-label={label}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

/** Keeps a row without children in line with the rows that have a chevron. */
export function DisclosureSpace() {
  return <span className={styles.button} aria-hidden="true" />;
}
