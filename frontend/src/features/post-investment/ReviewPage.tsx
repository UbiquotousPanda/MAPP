import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/api/errors';
import { allows, gateItem } from '@/session/gate-action';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { recordHref } from '@/ui/record-links';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { downloadReview, useReview } from './api';
import type { Review } from './api';
import { DeleteReviewDialog } from './DeleteReviewDialog';
import { ReviewDetails } from './ReviewDetails';
import { ReviewForm } from './ReviewForm';
import { LiveFigures, ReviewStatusChip, RoiFigure } from './ReviewParts';
import { DOWNLOAD, PREPARING, REVIEW_TITLE, REVIEWS_TITLE, pathText } from './review-text';
import { useReviewExport } from './useReviewExport';
import styles from './PostInvestment.module.css';

const GONE = 'This post-investment review no longer exists — someone may have deleted it.';
const BREADCRUMB = [
  { label: REVIEWS_TITLE, to: '/post-investment-reviews' },
  { label: REVIEW_TITLE },
];

export function ReviewPage() {
  const { reviewId = '' } = useParams();
  const query = useReview(reviewId);
  usePageTitle(REVIEW_TITLE);

  if (query.isPending || query.isError) {
    return (
      <div className={styles.page}>
        <PageHeader breadcrumb={BREADCRUMB} title={REVIEW_TITLE} />
        <Card>
          {query.isPending ? (
            <Skeleton lines={4} />
          ) : query.error instanceof ApiError && query.error.kind === 'notFound' ? (
            <EmptyState title={GONE} />
          ) : (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          )}
        </Card>
      </div>
    );
  }
  return <ReviewView review={query.data} />;
}

function ReviewView({ review }: { review: Review }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const exporting = useReviewExport(() => downloadReview(review.id));
  const editable = review.status === 'draft' && allows(review.access.edit);
  const moreActions = [
    ...gateItem(
      {
        label: DOWNLOAD,
        onSelect: exporting.run,
        disabled: exporting.preparing,
        ...(exporting.preparing ? { hint: PREPARING } : {}),
      },
      review.access.export,
    ),
    ...gateItem(
      { label: 'Delete review', tone: 'danger', onSelect: () => setDeleting(true) },
      review.access.delete,
    ),
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumb={BREADCRUMB}
        tag={<ReviewStatusChip status={review.status} />}
        title={review.activity.name}
        meta={pathText(review)}
        moreActions={moreActions}
      />
      <Card title={REVIEW_TITLE}>
        <div className={styles.page}>
          <p className={styles.note}>
            <Link to={recordHref('activity', review.activity.id)}>Open the activity</Link>
          </p>
          <dl className={styles.figures}>
            <RoiFigure roi={review.roi} />
          </dl>
          {editable ? (
            <ReviewForm key={review.id} review={review} />
          ) : (
            <ReviewDetails review={review} />
          )}
        </div>
      </Card>
      {review.figures && (
        <Card title="Activity figures">
          <LiveFigures figures={review.figures} />
        </Card>
      )}
      {deleting && (
        <DeleteReviewDialog
          review={review}
          onClose={() => setDeleting(false)}
          onDeleted={() => void navigate('/post-investment-reviews')}
        />
      )}
    </div>
  );
}
