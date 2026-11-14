import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import styles from './Builder.module.css';

export interface PanelToggleProps {
  /** What the panel holds, as the button says it: "settings" gives "Hide settings". */
  name: string;
  hidden: boolean;
  onToggle: () => void;
}

export function PanelToggle({ name, hidden, onToggle }: PanelToggleProps) {
  const Icon = hidden ? PanelRightOpen : PanelRightClose;
  const label = `${hidden ? 'Show' : 'Hide'} ${name}`;
  return (
    <Tooltip content={label}>
      <Button
        size="sm"
        variant="tertiary"
        icon={<Icon aria-hidden="true" />}
        aria-label={label}
        aria-expanded={!hidden}
        onClick={onToggle}
      />
    </Tooltip>
  );
}

/** The hidden panel keeps a narrow rail with the button that shows it again. */
export function PanelRail(props: PanelToggleProps) {
  return (
    <div className={cx(styles.panel, styles.rail)}>
      <PanelToggle {...props} />
    </div>
  );
}
