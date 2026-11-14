import type { components } from '@/api/generated/schema';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import { varianceText } from './variance';
import styles from './Revenue.module.css';

type Variance = components['schemas']['SummaryVariance'];

const TONES: Partial<Record<Variance, StatusTone>> = {
  abovePlan: 'positive',
  onPlan: 'active',
  belowPlan: 'review',
};

/** A ranked row's performance: the API's variance as a chip, then its per cent, so the per cents line up. */
export function PerformanceCell({
  figures,
}: {
  figures: { performance: number | null; variance: Variance };
}) {
  const { performance, variance } = figures;
  if (performance === null) return '—';
  const tone = TONES[variance];
  return (
    <span className={styles.performance}>
      {tone && <StatusChip tone={tone}>{varianceText(variance)}</StatusChip>}
      {performance}%
    </span>
  );
}
