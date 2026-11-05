import type { ApprovalSubmission } from './api';
import type { ApprovalActivity } from './approval-types';

type SubmissionKind = ApprovalSubmission['kind'];

export function submitLabel(status: ApprovalActivity['status']): string {
  switch (status) {
    case 'created':
      return 'Submit for approval';
    case 'approved':
      return 'Send line items for approval';
    default:
      return 'Re-submit for approval';
  }
}

export function submitConfirmLabel(kind: SubmissionKind): string {
  switch (kind) {
    case 'resubmit':
      return 'Re-submit for approval';
    case 'lineItems':
      return 'Send for approval';
    default:
      return 'Submit for approval';
  }
}

export function submitDialogTitle(submission: ApprovalSubmission): string {
  const name = submission.activityName;
  switch (submission.kind) {
    case 'resubmit':
      return `Re-submit '${name}' for approval?`;
    case 'lineItems':
      return `Send line items of '${name}' for approval?`;
    default:
      return `Submit '${name}' for approval?`;
  }
}

export function approvedAutomaticallyText(kind: SubmissionKind): string {
  return kind === 'lineItems'
    ? 'These line items will be approved automatically.'
    : 'This activity will be approved automatically.';
}

/** The toast after a submission; one that needed no decision says it was approved automatically. */
export function submittedToast(submission: ApprovalSubmission, status: string): string {
  const name = submission.activityName;
  const automatic =
    submission.approvedAutomatically || (submission.kind !== 'lineItems' && status === 'approved');
  if (automatic) {
    return submission.kind === 'lineItems'
      ? `Line items of '${name}' approved automatically`
      : `Activity '${name}' approved automatically`;
  }
  switch (submission.kind) {
    case 'resubmit':
      return `Activity '${name}' re-submitted for approval`;
    case 'lineItems':
      return `Line items of '${name}' sent for approval`;
    default:
      return `Activity '${name}' submitted for approval`;
  }
}
