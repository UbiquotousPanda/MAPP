import { Link } from 'react-router';
import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { purchaseRequestHref } from '@/ui/record-links';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import type { GsapLinkReport, GsapWaitingRow, GsapWaitingTab } from './api';
import type { GsapTable } from './gsap-address';
import { coverageText, pathText, ROUTING_LABELS, workingDaysText } from './gsap-text';
import { PagedTable } from './PagedTable';
import type { PagedColumn } from './PagedTable';
import styles from './GsapLink.module.css';
import { PathCell } from './PathCell';

interface WaitingTabProps {
  tab: GsapWaitingTab;
  finance: GsapLinkReport['finance'];
  total: number;
  table: GsapTable;
  onChange: (patch: Partial<GsapTable>) => void;
}

/** Waiting for GSAP (044 US2): approved purchase requests GSAP has not answered, by working days since routing. */
export function WaitingTab({ tab, finance, total, table, onChange }: WaitingTabProps) {
  const { dateTime, money } = useFormatters();
  if (tab.waiting === 0) {
    return <EmptyState compact title="Nothing is waiting for GSAP" />;
  }
  const columns: PagedColumn<GsapWaitingRow>[] = [
    {
      key: 'purchaseRequest',
      label: 'Purchase request',
      cell: (r) => (
        <>
          <Link to={purchaseRequestHref(r.purchaseRequestId)}>{r.name}</Link>
          <span className={styles.sub}>{r.purchaseRequestId}</span>
        </>
      ),
    },
    { key: 'vendor', label: 'Vendor', cell: (r) => r.vendor || '—' },
    { key: 'owner', label: 'Owner', cell: (r) => r.owner },
    { key: 'plan', label: 'Plan › Activity', cell: (r) => <PathCell text={pathText(r.path)} /> },
    {
      key: 'routedAt',
      label: 'Routed on',
      largestFirst: true,
      cell: (r) => (
        <>
          {dateTime(r.routedAt)}
          <span className={styles.sub}>{ROUTING_LABELS[r.routing]}</span>
        </>
      ),
    },
    { key: 'gsapPrNumber', label: 'GSAP PR number', cell: (r) => r.gsapPrNumber || '—' },
    {
      key: 'amount',
      label: 'Amount',
      numeric: true,
      largestFirst: true,
      cell: (r) => (r.amount ? money(r.amount) : '—'),
    },
    {
      key: 'waiting',
      label: 'Waiting',
      numeric: true,
      largestFirst: true,
      cell: (r) => (
        <>
          {workingDaysText(r.waitingWorkingDays)}
          {r.overTurnaround && <span className={styles.flag}>Over 2 working days</span>}
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
          tip="Approved purchase requests routed to the requisitioner that GSAP has not answered with a matching purchase order."
        />
        <SummaryCard
          label="Amount waiting"
          value={tab.amount ? money(tab.amount) : '—'}
          tip="The purchase requests' amounts, in plans where you may see financial data."
          detail={coverageText(finance)}
        />
        <SummaryCard
          label="Over 2 working days"
          value={formatWhole(tab.overTurnaround)}
          detail={
            tab.overTurnaround > 0 && (
              <span>
                <StatusChip tone="review">Past turnaround</StatusChip>
              </span>
            )
          }
          tip="Waiting more than two working days, Monday to Friday, since the routing GSAP has not answered."
        />
      </StatStrip>
      <PagedTable
        title="Waiting for GSAP"
        widget="waiting"
        columns={columns}
        rows={tab.rows}
        rowKey={(r) => r.purchaseRequestId}
        table={table}
        total={total}
        empty="No purchase request is waiting for GSAP."
        onChange={onChange}
      />
    </div>
  );
}
