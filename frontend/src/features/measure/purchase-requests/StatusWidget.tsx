import { useFormatters } from '@/format/useFormatters';
import { StatusMixWidget } from '../shared';
import type { StatusMixData } from './api';
import { statusWord } from './words';
import styles from './PurchaseRequests.module.css';

const COLOURS: Record<string, string> = {
  created: 'var(--chart-budget)',
  submitted: 'var(--chart-planned)',
  inReview: 'var(--chart-planned)',
  declined: 'var(--chart-budget)',
  approved: 'var(--chart-actual)',
  closed: 'var(--chart-committed)',
};

const TIP =
  'Each purchase request in view counted once by its status, with its amount and its share of the count in ' +
  'whole per cent. Waiting for GSAP counts Approved requests sent to GSAP that GSAP has not answered yet.';

export interface StatusWidgetProps {
  data?: StatusMixData;
  failed?: boolean;
  onRetry?: () => void;
}

export function StatusWidget({ data, failed, onRetry }: StatusWidgetProps) {
  const { money } = useFormatters();
  return (
    <StatusMixWidget
      wide
      report="purchasing"
      widget="status"
      title="Purchase requests by status"
      tip={TIP}
      failed={failed}
      onRetry={onRetry}
      intro={
        data && (
          <p className={styles.note}>
            {data.total} {data.total === 1 ? 'purchase request' : 'purchase requests'} ·{' '}
            {data.waitingForGsap} waiting for GSAP
          </p>
        )
      }
      mix={
        data && {
          total: data.total,
          totalAmount: money(data.totalAmount),
          items: data.items.map((item) => ({
            key: item.status,
            label: statusWord(item.status),
            count: item.count,
            sharePercent: item.sharePercent,
            amount: money(item.amount),
            colour: COLOURS[item.status],
          })),
        }
      }
    />
  );
}
