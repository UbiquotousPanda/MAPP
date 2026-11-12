import { Check } from 'lucide-react';
import { useId } from 'react';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import type { components } from '@/api/generated/schema';
import { Button } from '@/ui/Button/Button';
import { overPlannedCostText } from './decision-messages';
import styles from './ApprovalSection.module.css';

type ActivityOverage = components['schemas']['ActivityOverage'];

/** With Warn: each activity whose line items exceed its planned cost, before approving. */
export function OverPlannedCostAlert({ overages }: { overages: readonly ActivityOverage[] }) {
  if (overages.length === 0) {
    return null;
  }
  return (
    <InlineAlert tone="warning">
      {overages.map((overage) => (
        <p key={overage.activity.id}>{overPlannedCostText(overage)}</p>
      ))}
    </InlineAlert>
  );
}

export interface RefusedApproveProps {
  reason: string;
  /** The element already showing the reason; without it the reason is shown next to the button. */
  reasonId?: string;
}

/** Approve shown disabled with its reason, described by it for screen readers. */
export function RefusedApprove({ reason, reasonId }: RefusedApproveProps) {
  const ownId = useId();
  return (
    <span className={styles.withReason}>
      <Button icon={<Check />} disabled aria-describedby={reasonId ?? ownId}>
        Approve
      </Button>
      {!reasonId && (
        <span id={ownId} className={styles.reason}>
          {reason}
        </span>
      )}
    </span>
  );
}
