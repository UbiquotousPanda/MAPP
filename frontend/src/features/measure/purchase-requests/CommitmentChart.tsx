import { useFormatters } from '@/format/useFormatters';
import { ReportWidget } from '../shared';
import type { ReportTableData } from '../shared';
import type { ChartData } from './api';
import styles from './PurchaseRequests.module.css';

const TOKENS = [
  'var(--chart-planned)',
  'var(--chart-committed)',
  'var(--chart-actual)',
  'var(--chart-budget)',
];

const TIP =
  'Committed by approved purchase requests: the Approved and Closed lines in the calendar month of their delivery date, from the ' +
  'first to the last month; a line without a delivery date is under No delivery date. The ten largest are ' +
  'named and the rest are Other; the table view lists all.';

export interface CommitmentChartProps {
  widget: 'byVendor' | 'byOwner';
  title: string;
  rowLabel: string;
  data?: ChartData;
  failed?: boolean;
  onRetry?: () => void;
}

const NOTHING_COMMITTED =
  'Nothing is committed yet. Commitment starts when a purchase request is approved.';

function amountOf(value: { amount: string } | null | undefined): number {
  return value ? Number(value.amount) : 0;
}

function Bars({ data, label }: { data: ChartData; label: (key: string) => string }) {
  const { money } = useFormatters();
  const peak = Math.max(1, ...data.totals.map(amountOf));
  return (
    <>
      <ul className={styles.legend} aria-label="Series">
        {data.chartSeries.map((s, i) => (
          <li key={s.key}>
            <span className={styles.swatch} style={{ background: TOKENS[i % TOKENS.length] }} />
            {s.name}
          </li>
        ))}
      </ul>
      <ul className={styles.months}>
        {data.months.map((m, mi) => (
          <li key={m} className={styles.month}>
            <span>{label(m)}</span>
            <span className={styles.track} aria-hidden="true">
              {data.chartSeries.map((s, i) => (
                <span
                  key={s.key}
                  className={styles.fill}
                  title={`${s.name}: ${money(s.values[mi])}`}
                  style={{
                    width: `${(amountOf(s.values[mi]) / peak) * 100}%`,
                    background: TOKENS[i % TOKENS.length],
                  }}
                />
              ))}
            </span>
            <span className={styles.value}>{money(data.totals[mi])}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function CommitmentChart({
  widget,
  title,
  rowLabel,
  data,
  failed,
  onRetry,
}: CommitmentChartProps) {
  const { money, month } = useFormatters();
  const label = (key: string) => (key === 'none' ? 'No delivery date' : month(key));
  const table: ReportTableData = {
    columns: [
      { label: rowLabel },
      ...(data?.months ?? []).map((m) => ({ label: label(m), numeric: true })),
      { label: 'Total', numeric: true },
    ],
    rows: (data?.allSeries ?? []).map((s) => ({
      key: s.key,
      cells: [s.name, ...s.values.map((v) => money(v)), money(s.total)],
    })),
    total: data && ['Total', ...data.totals.map((t) => money(t)), money(data.committed)],
  };
  return (
    <ReportWidget
      wide
      report="purchaseRequests"
      widget={widget}
      title={title}
      tip={TIP}
      loading={!data && !failed}
      failed={failed}
      onRetry={onRetry}
      table={table}
      chart={
        data &&
        (data.months.length === 0 ? (
          <p className={styles.empty}>{NOTHING_COMMITTED}</p>
        ) : (
          <Bars data={data} label={label} />
        ))
      }
    />
  );
}
