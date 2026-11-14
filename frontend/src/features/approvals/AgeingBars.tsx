import type { components } from '@/api/generated/schema';
import { BarList } from '@/ui/BarList/BarList';

type AgeingBucket = components['schemas']['ApprovalAgeingBucket'];

const LABELS: Record<AgeingBucket['bucket'], string> = {
  under1: 'Under 1 day',
  days1to2: '1–2 days',
  days3to5: '3–5 days',
  days6to10: '6–10 days',
  over10: 'More than 10 days',
};

/** "How long approvals have waited": one bar per bucket, in order, its count written out. */
export function AgeingBars({ buckets }: { buckets: AgeingBucket[] }) {
  return (
    <BarList
      label="Approvals by time waited"
      items={buckets.map((bucket) => ({
        key: bucket.bucket,
        label: LABELS[bucket.bucket] ?? bucket.label,
        value: String(bucket.count),
        size: bucket.count,
      }))}
    />
  );
}
