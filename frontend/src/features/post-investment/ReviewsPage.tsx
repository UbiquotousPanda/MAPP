import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, localDate } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { allows, gateItem } from '@/session/gate-action';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { downloadReviews, useReviews } from './api';
import type { Review, ReviewList } from './api';
import { ReviewStatusChip } from './ReviewParts';
import {
  DOWNLOAD,
  LABELS,
  NO_REVIEWS,
  NO_REVIEWS_TEXT,
  PREPARING,
  REVIEWS_TITLE,
  ROI_LABEL,
  moneyText,
  pathText,
  reviewHref,
  reviewRoiText,
  spentText,
} from './review-text';
import { useReviewExport } from './useReviewExport';
import styles from './PostInvestment.module.css';

export function ReviewsPage() {
  usePageTitle(REVIEWS_TITLE);
  const query = useReviews();
  const exporting = useReviewExport(() => downloadReviews());
  const list = query.data;
  const canExport = list !== undefined && list.items.length > 0 && allows(list.export);
  const moreActions = canExport
    ? gateItem(
        {
          label: DOWNLOAD,
          onSelect: exporting.run,
          disabled: exporting.preparing,
          ...(exporting.preparing ? { hint: PREPARING } : {}),
        },
        list.export,
      )
    : [];

  return (
    <div className={styles.page}>
      <PageHeader title={REVIEWS_TITLE} moreActions={moreActions} />
      <Card>
        {query.isPending ? (
          <Skeleton lines={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <Loaded list={query.data} />
        )}
      </Card>
    </div>
  );
}

function Loaded({ list }: { list: ReviewList }) {
  if (list.items.length === 0) {
    return <EmptyState icon={<FileText />} title={NO_REVIEWS} text={NO_REVIEWS_TEXT} />;
  }
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="visually-hidden">{REVIEWS_TITLE}</caption>
        <thead>
          <tr>
            <th scope="col">{LABELS.activity}</th>
            <th scope="col">{LABELS.status}</th>
            <th scope="col" className={styles.numeric}>
              {LABELS.amountSpent}
            </th>
            <th scope="col" className={styles.numeric}>
              {LABELS.margin}
            </th>
            <th scope="col" className={styles.numeric}>
              {ROI_LABEL}
            </th>
            <th scope="col">{LABELS.updated}</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { dateFormat } = useFormatters();
  return (
    <tr>
      <th scope="row">
        <Link to={reviewHref(review.id)}>{review.activity.name}</Link>
        <span className={styles.secondary}>{pathText(review)}</span>
      </th>
      <td>
        <ReviewStatusChip status={review.status} />
      </td>
      <td className={styles.numeric}>{spentText(review)}</td>
      <td className={styles.numeric}>{moneyText(review.margin)}</td>
      <td className={styles.numeric}>{reviewRoiText(review)}</td>
      <td>{formatDate(localDate(review.updatedAt), dateFormat)}</td>
    </tr>
  );
}
