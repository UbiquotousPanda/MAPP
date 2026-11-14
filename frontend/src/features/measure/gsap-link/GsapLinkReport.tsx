import { useEffect, useRef } from 'react';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { writeAddress } from '../shared';
import type { ReportAddress } from '../shared';
import { useGsapLink } from './api';
import type { GsapLinkReport as Report } from './api';
import { useGsapTable } from './gsap-address';
import type { GsapTab, GsapTable } from './gsap-address';
import { OrdersTab } from './OrdersTab';
import { SwbsTab } from './SwbsTab';
import { WaitingTab } from './WaitingTab';

/** One GSAP link tab (feature 044) for the frame's filters; a filter change starts its rows on page 1. */
export function GsapLinkBody({ address, tab }: { address: ReportAddress; tab: GsapTab }) {
  const { table, change } = useGsapTable(tab);
  const report = useGsapLink(address, table);
  const filters = writeAddress(address).toString();
  const shown = useRef(filters);
  const { page } = table;
  useEffect(() => {
    if (shown.current === filters) {
      return;
    }
    shown.current = filters;
    if (page > 1) {
      change({ page: 1 });
    }
  }, [filters, page, change]);
  if (report.data) {
    return <TabBody report={report.data} table={table} onChange={change} />;
  }
  return report.isError ? (
    <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  ) : (
    <div aria-label="Loading the tab">
      <Skeleton lines={6} height="24px" />
    </div>
  );
}

interface TabBodyProps {
  report: Report;
  table: GsapTable;
  onChange: (patch: Partial<GsapTable>) => void;
}

function TabBody({ report, table, onChange }: TabBodyProps) {
  if (report.swbs) {
    return <SwbsTab tab={report.swbs} total={report.total} table={table} onChange={onChange} />;
  }
  if (report.waiting) {
    return (
      <WaitingTab
        tab={report.waiting}
        finance={report.finance}
        total={report.total}
        table={table}
        onChange={onChange}
      />
    );
  }
  if (report.orders) {
    return (
      <OrdersTab
        tab={report.orders}
        finance={report.finance}
        total={report.total}
        table={table}
        onChange={onChange}
      />
    );
  }
  return null;
}
