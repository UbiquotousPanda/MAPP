import type { components } from '@/api/generated/schema';
import { StatusChip } from '../StatusChip/StatusChip';

export type LineItemApproval = components['schemas']['LineItemApproval'];

/** A line item's own approval: Approved only while its activity is approved too. */
export function LineItemApprovalChip({ approval }: { approval: LineItemApproval }) {
  return approval === 'approved' ? (
    <StatusChip tone="positive">Approved</StatusChip>
  ) : (
    <StatusChip tone="neutral">Not approved</StatusChip>
  );
}
