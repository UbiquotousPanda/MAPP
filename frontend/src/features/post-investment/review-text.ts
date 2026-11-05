import { formatMoneyText, formatPercent } from '@/format/decimal';
import type { Money, Review } from './api';

export const REVIEWS_TITLE = 'Post-investment reviews';
export const REVIEW_TITLE = 'Post-investment review';
export const ROI_LABEL = 'Post-investment ROI';
export const DOWNLOAD = 'Download PowerPoint';
export const START = 'Start post-investment review';
export const OPEN = 'Open review';

export const LABELS = {
  activity: 'Activity',
  plan: 'Plan',
  status: 'Status',
  businessCase: 'Business case',
  amountSpent: 'Amount spent',
  margin: 'Margin',
  remarks: 'Remarks',
  updated: 'Updated',
  budget: 'Budget',
  planned: 'Planned cost',
  committed: 'Committed',
  actual: 'Actual',
} as const;

export const HINTS = {
  businessCase: 'Optional to save; needed to submit.',
  amountSpent: "Prefilled from the activity's actual cost.",
  roi: '(Margin − amount spent) ÷ amount spent, worked out by SP&A One.',
  figures: "The activity's figures now; the budget is its initiative's.",
} as const;

export const NO_REVIEWS = 'No post-investment reviews yet';
export const NO_REVIEWS_TEXT =
  "Start one from an activity's Overview, once the activity's money is spent.";
export const NO_ACTIVITY_REVIEW = 'This activity has no post-investment review yet.';
export const NOT_SET = 'Not set';
export const SAVED = 'Review saved';
export const SUBMITTED = 'Review submitted';
export const PREPARING = 'Preparing the file…';
export const SUBMITTED_NOTE = 'Submitted reviews are read-only.';

export function statusText(status: Review['status']): string {
  return status === 'submitted' ? 'Submitted' : 'Draft';
}

export function reviewHref(reviewId: string): string {
  return `/post-investment-reviews/${reviewId}`;
}

/** The plan path as one line: "FY2026 Lubricants Europe › Brand launch › Digital". */
export function pathText(review: Review): string {
  return review.path.map((step) => step.name).join(' › ');
}

export function moneyText(money: Money | null): string {
  return money ? formatMoneyText(money) : NOT_SET;
}

/** The server's ROI as written; never worked out here. */
export function roiText(roi: string | null): string {
  return roi === null ? NOT_SET : formatPercent(roi);
}
