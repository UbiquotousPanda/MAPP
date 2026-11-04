import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import type { ReviewStatus } from './api';

export const REVIEW = 'Rows to review';
export const REVIEW_DESCRIPTION =
  'Rows that could not be loaded or matched to an activity. Correct them, or dismiss them with a reason.';

export const STATUS_WORDS: Record<ReviewStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const STATUS_TONES: Record<ReviewStatus, StatusTone> = {
  open: 'review',
  resolved: 'positive',
  dismissed: 'neutral',
};

export const REASON_WORDS: Record<string, string> = {
  'unmatched:unknown': 'No activity has this key',
  'unmatched:ambiguous': 'The key fits several activities',
  'unmatched:disagree': 'Keys disagree',
  'rejected:emptyColumn': 'Rejected: a required column is empty',
  'rejected:invalidDate': 'Rejected: the date is not a date',
  'rejected:futureDate': 'Rejected: the date is in the future',
  'rejected:negativeCount': 'Rejected: a count is below zero',
  'rejected:fractionalCount': 'Rejected: a count is not a whole number',
  'rejected:invalidCount': 'Rejected: a count is not a number',
  'rejected:invalidAmount': 'Rejected: an amount is not a number',
  'rejected:unconfiguredCurrency': 'Rejected: the currency is not configured',
  'rejected:missingReference': 'Rejected: the reference is missing',
  'rejected:referenceTooLong': 'Rejected: the reference is too long',
  'rejected:journeyTooLong': 'Rejected: the journey reference is too long',
  'rejected:repeatedReference': 'Rejected: the reference repeats in the file',
  'rejected:noMeasure': 'Rejected: no figure in any measure column',
  'rejected:duplicateMeasure': 'Rejected: two columns carry the same measure',
};

export function reasonWord(reason: string): string {
  return REASON_WORDS[reason] ?? reason;
}

export const EMPTY_TITLE = 'Nothing to review';
export const EMPTY_TEXT =
  'Every row loaded so far was matched or deliberately left without an activity.';
export const NO_MATCH = 'Nothing matches these filters';
export const COMMENT_NEEDED = 'Say why this row is being dismissed.';
export const NO_HAND_ROWS =
  'Rows arrive only from uploads and simulated pulls; none can be added by hand.';
