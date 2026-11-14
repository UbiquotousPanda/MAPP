import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { Converted } from '@/features/line-items';
import { useFormatters } from '@/format/useFormatters';
import { ActivityStatusChip } from '@/ui/ActivityStatusChip/ActivityStatusChip';
import type { ActivitySummary } from './api';
import styles from './ActivityRowCells.module.css';
import { lineItemsAttentionText } from './activity-text';

export function ActivityRowStatus({ row, href }: { row: ActivitySummary; href: string }) {
  const { missingFields, lineItemsNeedingAttention } = row.completeness;
  return (
    <span className={styles.chips}>
      <ActivityStatusChip status={row.displayStatus} />
      {missingFields === 0 && lineItemsNeedingAttention === 0 && (
        <StatusChip tone="positive">All filled in</StatusChip>
      )}
      {missingFields > 0 && (
        <Link to={`${href}#ready`} className={styles.chipLink}>
          <StatusChip tone="problem">
            {missingFields === 1 ? '1 field needed' : `${missingFields} fields needed`}
          </StatusChip>
        </Link>
      )}
      {lineItemsNeedingAttention > 0 && (
        <Link to={`${href}#ready`} className={styles.chipLink}>
          <StatusChip tone="problem">
            {lineItemsAttentionText(lineItemsNeedingAttention)}
          </StatusChip>
        </Link>
      )}
    </span>
  );
}

// Overspent: the unassigned planned cost is negative because the line items exceed it.
export function ActivityRowCost({ row }: { row: ActivitySummary }) {
  const { money } = useFormatters();
  const overspent = row.unassignedPlannedCost?.amount.startsWith('-') ?? false;
  const plan = row.plannedCost;
  const display = row.display.plannedCost;
  const both = Boolean(plan && display && plan.currency !== display.currency);
  return (
    <span className={overspent ? styles.overspent : undefined}>
      {both ? money(plan) : money(display)}
      {overspent && (
        <>
          {' '}
          <CircleAlert aria-hidden="true" className={styles.mark} />
          <span className="visually-hidden">Line items exceed the planned cost</span>
        </>
      )}
      {both && plan && display && (
        <span className={styles.beside}>
          <Converted from={plan.currency} amount={display} />
        </span>
      )}
    </span>
  );
}
