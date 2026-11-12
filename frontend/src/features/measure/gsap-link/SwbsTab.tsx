import { Link } from 'react-router';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { recordHref } from '@/ui/record-links';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { ReportWidget } from '../shared';
import type { GsapBand, GsapSwbsRow, GsapSwbsTab } from './api';
import type { GsapTable } from './gsap-address';
import { bandText, pathText, TAB_LABELS, waitingText } from './gsap-text';
import { PagedTable } from './PagedTable';
import type { PagedColumn } from './PagedTable';
import styles from './GsapLink.module.css';
import { PathCell } from './PathCell';

interface SwbsTabProps {
  tab: GsapSwbsTab;
  total: number;
  table: GsapTable;
  onChange: (patch: Partial<GsapTable>) => void;
}

/** Waiting for SWBS code (044 US1): line items Ready to send to GSAP, waiting since their activity was approved. */
export function SwbsTab({ tab, total, table, onChange }: SwbsTabProps) {
  const { dateTime } = useFormatters();
  if (tab.waiting === 0) {
    return <EmptyState compact title="Nothing is waiting for an SWBS code" />;
  }
  const columns: PagedColumn<GsapSwbsRow>[] = [
    {
      key: 'lineItem',
      label: 'Line item',
      cell: (r) => (
        <>
          <Link to={recordHref('lineItem', r.lineItemId)}>{r.lineItem}</Link>
          <span className={styles.sub}>{r.lineItemId}</span>
        </>
      ),
    },
    { key: 'plan', label: 'Plan › Activity', cell: (r) => <PathCell text={pathText(r.path)} /> },
    { key: 'owner', label: 'Activity owner', cell: (r) => r.owner || '—' },
    { key: 'companyCode', label: 'Company code', cell: (r) => r.companyCode || '—' },
    {
      key: 'approvedAt',
      label: 'Approved on',
      largestFirst: true,
      cell: (r) => dateTime(r.approvedAt),
    },
    {
      key: 'waiting',
      label: 'Waiting',
      numeric: true,
      largestFirst: true,
      cell: (r) => (
        <>
          {waitingText(r.waitingHours)}
          {r.overTurnaround && <span className={styles.flag}>Over 48 hours</span>}
        </>
      ),
    },
  ];
  return (
    <div className={styles.body}>
      <StatStrip label="Summary">
        <SummaryCard
          label="Waiting"
          value={formatWhole(tab.waiting)}
          tip="Line items Ready to send to GSAP: their activity is approved and they have no SWBS code yet."
        />
        <SummaryCard
          label="Over 48 hours"
          value={formatWhole(tab.overTurnaround)}
          detail={
            tab.overTurnaround > 0 && (
              <span>
                <StatusChip tone="review">Past turnaround</StatusChip>
              </span>
            )
          }
          tip="Waiting longer than GSAP's 48-hour turnaround since the activity was approved."
        />
      </StatStrip>
      <ReportWidget
        report="gsapLink"
        widget="swbsBands"
        title="Waiting by time"
        tip="The line items of the table by how long they have waited since their activity was approved."
        chart={<BandBars bands={tab.bands} />}
        table={{
          columns: [{ label: 'Waiting' }, { label: 'Line items', numeric: true }],
          rows: tab.bands.map((b) => ({ key: b.key, cells: [bandText(b), formatWhole(b.count)] })),
          total: ['Total', formatWhole(tab.waiting)],
        }}
      />
      <PagedTable
        title={TAB_LABELS.swbs}
        widget="swbs"
        columns={columns}
        rows={tab.rows}
        rowKey={(r) => r.lineItemId}
        table={table}
        total={total}
        empty="No line item is waiting for an SWBS code."
        onChange={onChange}
      />
    </div>
  );
}

/** The bands as bars, each with its count in words, so colour is never the only signal. */
function BandBars({ bands }: { bands: GsapBand[] }) {
  const largest = Math.max(1, ...bands.map((b) => b.count));
  return (
    <ul className={styles.bars} aria-label="Line items by waiting time">
      {bands.map((b) => (
        <li key={b.key} className={styles.bar}>
          <span>{bandText(b)}</span>
          <span className={styles.track} aria-hidden="true">
            <span
              className={styles.fill}
              style={{ width: `${String((b.count / largest) * 100)}%` }}
            />
          </span>
          <span className={styles.barValue}>{formatWhole(b.count)}</span>
        </li>
      ))}
    </ul>
  );
}
