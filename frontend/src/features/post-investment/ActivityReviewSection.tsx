import { useNavigate } from 'react-router';
import { ApiError, isSessionLost } from '@/api/errors';
import type { Availability } from '@/session/access';
import { allows } from '@/session/gate-action';
import { Button, LinkButton } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useToast } from '@/ui/Toast/useToast';
import { useCreateReview, useReviews } from './api';
import type { Review } from './api';
import { Figure, ReviewStatusChip, RoiFigure } from './ReviewParts';
import {
  LABELS,
  NO_ACTIVITY_REVIEW,
  OPEN,
  REVIEW_TITLE,
  START,
  moneyText,
  reviewHref,
  spentText,
} from './review-text';
import styles from './PostInvestment.module.css';

interface ActivityReviewSectionProps {
  activityId: string;
  /** The activity's own edit availability: starting a review changes the activity's records. */
  edit: Availability | undefined;
}

/** The activity's post-investment review: its status and ROI, or a way to start one. */
export function ActivityReviewSection({ activityId, edit }: ActivityReviewSectionProps) {
  const query = useReviews(activityId);
  const review = query.data?.items[0];
  return (
    <Card
      title={REVIEW_TITLE}
      actions={review ? <LinkButton to={reviewHref(review.id)}>{OPEN}</LinkButton> : undefined}
    >
      {query.isPending ? (
        <Skeleton lines={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : review ? (
        <Summary review={review} />
      ) : (
        <NoReview activityId={activityId} canStart={allows(edit)} />
      )}
    </Card>
  );
}

function Summary({ review }: { review: Review }) {
  return (
    <div className={styles.cardBody}>
      <ReviewStatusChip status={review.status} />
      <dl className={styles.figures}>
        <Figure label={LABELS.amountSpent} value={spentText(review)} />
        <Figure label={LABELS.margin} value={moneyText(review.margin)} />
        <RoiFigure review={review} />
      </dl>
    </div>
  );
}

function NoReview({ activityId, canStart }: { activityId: string; canStart: boolean }) {
  const create = useCreateReview();
  const navigate = useNavigate();
  const { show } = useToast();

  async function start() {
    if (create.isPending) {
      return;
    }
    try {
      const review = await create.mutateAsync(activityId);
      void navigate(reviewHref(review.id));
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('other');
      if (!isSessionLost(failure)) {
        show({ message: failure.message });
      }
    }
  }

  return (
    <div className={styles.cardBody}>
      <p className={styles.note}>{NO_ACTIVITY_REVIEW}</p>
      {canStart && (
        <Button onClick={() => void start()} disabled={create.isPending}>
          {START}
        </Button>
      )}
    </div>
  );
}
