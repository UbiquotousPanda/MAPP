import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import type { Review, ReviewFigures } from './api';
import { HINTS, LABELS, ROI_LABEL, moneyText, roiText, statusText } from './review-text';
import styles from './PostInvestment.module.css';

export function ReviewStatusChip({ status }: { status: Review['status'] }) {
  return (
    <StatusChip tone={status === 'submitted' ? 'done' : 'neutral'}>{statusText(status)}</StatusChip>
  );
}

interface FigureProps {
  label: string;
  value: string;
}

export function Figure({ label, value }: FigureProps) {
  return (
    <div className={styles.figure}>
      <dt className={styles.figureLabel}>{label}</dt>
      <dd className={styles.figureValue}>{value}</dd>
    </div>
  );
}

export function RoiFigure({ roi }: { roi: string | null }) {
  return (
    <div className={styles.figure}>
      <dt className={styles.figureLabel}>
        {ROI_LABEL} <InfoTip label={ROI_LABEL} text={HINTS.roi} />
      </dt>
      <dd className={styles.figureValue} aria-label={`${ROI_LABEL}: ${roiText(roi)}`}>
        {roiText(roi)}
      </dd>
    </div>
  );
}

/** The activity's figures, read live by the server; nothing when the person can't see them. */
export function LiveFigures({ figures }: { figures: ReviewFigures | null }) {
  if (!figures) {
    return null;
  }
  return (
    <div className={styles.live}>
      <p className={styles.note}>{HINTS.figures}</p>
      <dl className={styles.figures}>
        <Figure label={LABELS.budget} value={moneyText(figures.budget)} />
        <Figure label={LABELS.planned} value={moneyText(figures.planned)} />
        <Figure label={LABELS.committed} value={moneyText(figures.committed)} />
        <Figure label={LABELS.actual} value={moneyText(figures.actual)} />
      </dl>
    </div>
  );
}
