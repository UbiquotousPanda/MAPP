import { useFormatters } from '@/format/useFormatters';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import type { CardsData } from './api';
import { COMMITTED, COMMITTED_TIP } from './words';
import styles from './PurchaseRequests.module.css';

export interface CardsRowProps {
  data?: CardsData;
  failed?: boolean;
}

/** The report's totals as one strip; a failed load shows nothing here, as the widgets below offer Try again. */
export function CardsRow({ data, failed }: CardsRowProps) {
  const { money } = useFormatters();
  if (failed) {
    return null;
  }
  if (!data) {
    return <Skeleton lines={2} height="32px" />;
  }
  return (
    <div className={styles.cards}>
      <StatStrip label="Summary">
        <SummaryCard label="Purchase requests" value={data.purchaseRequests} />
        <SummaryCard label="Lines" value={data.lines} />
        <SummaryCard label="Vendors" value={data.vendors} />
        <SummaryCard label={COMMITTED} value={money(data.committed)} tip={COMMITTED_TIP} />
        <SummaryCard
          label="Invoiced"
          value={money(data.invoiced)}
          tip="The invoices less credit notes on the purchase order lines of these requests."
        />
      </StatStrip>
    </div>
  );
}
