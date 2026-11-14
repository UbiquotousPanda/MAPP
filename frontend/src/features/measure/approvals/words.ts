import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import { RECORD_TYPES } from './schemas';
import type { RecordType } from './schemas';

export { NOTHING } from '../shared';

export const RECORD_WORDS: Record<RecordType, string> = {
  activity: 'Activities',
  purchaseRequest: 'Purchase requests',
  modifiedPurchaseRequest: 'Modified purchase requests',
};

export const OUTCOME_WORDS: Record<string, string> = {
  waiting: 'Waiting',
  approved: 'Approved',
  declined: 'Declined',
  recalled: 'Recalled',
  replaced: 'Replaced by a new submission',
  autoApproved: 'Approved automatically',
  notNeeded: 'Not needed',
};

export function recordWord(type: string): string {
  const known = RECORD_TYPES.find((t) => t === type);
  return known ? RECORD_WORDS[known] : type;
}

const ONE_RECORD: Record<RecordType, string> = {
  activity: 'Activity',
  purchaseRequest: 'Purchase request',
  modifiedPurchaseRequest: 'Modified purchase request',
};

/** A table row names its one record: "Activity", not the filter's "Activities". */
export function oneRecordWord(type: string): string {
  const known = RECORD_TYPES.find((t) => t === type);
  return known ? ONE_RECORD[known] : type;
}

export const OUTCOME_TONES: Record<string, StatusTone> = {
  waiting: 'review',
  approved: 'positive',
  autoApproved: 'positive',
  declined: 'problem',
  recalled: 'neutral',
  replaced: 'neutral',
  notNeeded: 'neutral',
};

const DAY_MS = 86_400_000;

/** How long a waiting step has waited, from its submission date to `today` (both "YYYY-MM-DD"). */
export function waitingText(submittedOn: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(submittedOn)) / DAY_MS);
  return days < 1 ? 'Waiting since today' : `Waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}
