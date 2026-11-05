import { LockedNote } from '@/ui/LockedNote/LockedNote';
import type { Review } from './api';
import { LABELS, NOT_SET, SUBMITTED_NOTE, moneyText } from './review-text';
import styles from './PostInvestment.module.css';

/** A review that can't be changed here: Submitted, or the person may not edit its activity. */
export function ReviewDetails({ review }: { review: Review }) {
  const reason =
    review.status === 'submitted' ? SUBMITTED_NOTE : review.access.edit.reason || undefined;
  return (
    <div className={styles.form}>
      {reason && <LockedNote>{reason}</LockedNote>}
      <dl className={styles.details}>
        <dt>{LABELS.businessCase}</dt>
        <dd>{review.businessCase || NOT_SET}</dd>
        <dt>{LABELS.amountSpent}</dt>
        <dd>{moneyText(review.amountSpent)}</dd>
        <dt>{LABELS.margin}</dt>
        <dd>{moneyText(review.margin)}</dd>
        <dt>{LABELS.remarks}</dt>
        <dd>{review.remarks || NOT_SET}</dd>
      </dl>
    </div>
  );
}
