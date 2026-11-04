import { useFormatters } from '@/format/useFormatters';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { StatusMixData } from './api';
import { statusWord } from './words';
import styles from './PurchaseRequests.module.css';

const COLOURS: Record<string, string> = {
  created: 'var(--chart-cat-7)',
  submitted: 'var(--chart-cat-1)',
  inReview: 'var(--chart-cat-3)',
  declined: 'var(--chart-cat-5)',
  approved: 'var(--chart-cat-4)',
  closed: 'var(--chart-cat-2)',
};

const TIP =
  'Each purchase request in view counted once by its status, with its amount and its share of the count in ' +
  'whole per cent. Waiting for GSAP counts Approved requests sent to GSAP that GSAP has not answered yet.';

export interface StatusWidgetProps {
  data?: StatusMixData;
  failed?: boolean;
  onRetry?: () => void;
}

function Bars({ mix }: { mix: StatusMixData }) {
  const { money } = useFormatters();
  return (
    <>
      <p className={styles.note}>
        {mix.total} purchase requests · {mix.waitingForGsap} waiting for GSAP
      </p>
      <ul className={styles.bars}>
        {mix.items.map((item) => (
          <li key={item.status} className={styles.bar}>
            <span>{statusWord(item.status)}</span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.fill}
                style={{ width: `${item.sharePercent}%`, background: COLOURS[item.status] }}
              />
            </span>
            <span className={styles.value}>
              {item.count} · {item.sharePercent} % · {money(item.amount)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StatusWidget({ data, failed, onRetry }: StatusWidgetProps) {
  const { money } = useFormatters();
  const table: ReportTableData = {
    columns: [
      { label: 'Status' },
      { label: 'Count', numeric: true },
      { label: 'Amount', numeric: true },
      { label: 'Share', numeric: true },
    ],
    rows: (data?.items ?? []).map((i) => ({
      key: i.status,
      cells: [statusWord(i.status), String(i.count), money(i.amount), `${i.sharePercent} %`],
    })),
    total: data && [
      'Total',
      String(data.total),
      money(data.totalAmount),
      data.total ? '100 %' : '—',
    ],
  };
  return (
    <ReportWidget
      report="purchaseRequests"
      widget="status"
      title="Purchase requests by status"
      tip={TIP}
      loading={!data && !failed}
      failed={failed}
      onRetry={onRetry}
      table={table}
      chart={data && <Bars mix={data} />}
    />
  );
}
