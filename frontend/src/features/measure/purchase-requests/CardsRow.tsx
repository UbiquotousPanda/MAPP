import { useFormatters } from '@/format/useFormatters';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { CardsData } from './api';
import styles from './PurchaseRequests.module.css';

const TIP =
  'Purchase requests, lines and vendors in view. Committed is the amount of the Approved and Closed lines; ' +
  'Invoiced is the invoices less credit notes on their purchase order lines.';

export interface CardsRowProps {
  data?: CardsData;
  failed?: boolean;
  onRetry?: () => void;
}

export function CardsRow({ data, failed, onRetry }: CardsRowProps) {
  const { money } = useFormatters();
  const cards = data && [
    { label: 'Purchase requests', value: String(data.purchaseRequests) },
    { label: 'Lines', value: String(data.lines) },
    { label: 'Vendors', value: String(data.vendors) },
    { label: 'Committed', value: money(data.committed) },
    { label: 'Invoiced', value: money(data.invoiced) },
  ];
  const table: ReportTableData = {
    columns: [{ label: 'Card' }, { label: 'Value', numeric: true }],
    rows: (cards ?? []).map((c) => ({ key: c.label, cells: [c.label, c.value] })),
  };
  return (
    <ReportWidget
      wide
      report="purchaseRequests"
      widget="cards"
      title="Summary"
      tip={TIP}
      loading={!data && !failed}
      failed={failed}
      onRetry={onRetry}
      table={table}
      chart={
        cards && (
          <dl className={styles.cards}>
            {cards.map((c) => (
              <div key={c.label} className={styles.card}>
                <dt>{c.label}</dt>
                <dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        )
      }
    />
  );
}
