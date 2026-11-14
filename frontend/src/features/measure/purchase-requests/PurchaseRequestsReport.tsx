import { ChartColumnIncreasing, FileText } from 'lucide-react';
import { useAddressParams } from '@/ui/useAddressParams';
import { LinkButton } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import type { ReportAddress } from '../shared';
import { useRequestsReport } from './api';
import type { RequestsReportData } from './api';
import { CardsRow } from './CardsRow';
import { CommitmentChart } from './CommitmentChart';
import { RequestsGrid } from './RequestsGrid';
import { DEFAULT_PARAMS, readRequestsParams, writeRequestsParams } from './schemas';
import type { RequestsParams } from './schemas';
import { StatusWidget } from './StatusWidget';

/** The report with the address's own parameters; off the grid, its sort and pages are another tab's. */
function useRequests(address: ReportAddress, onGrid: boolean) {
  const [search, setSearch] = useAddressParams();
  const read = readRequestsParams(search);
  const params: RequestsParams = onGrid
    ? read
    : {
        ...read,
        sort: DEFAULT_PARAMS.sort,
        order: DEFAULT_PARAMS.order,
        page: 1,
        pageSize: DEFAULT_PARAMS.pageSize,
      };
  const report = useRequestsReport(address, params);
  const change = (changes: Partial<RequestsParams>) =>
    setSearch(writeRequestsParams(search, { ...params, page: 1, ...changes }));
  return { params, report, change };
}

const filtered = (p: RequestsParams) =>
  Boolean(p.q || p.vendors.length || p.requestOwners.length || p.statuses.length);

/** Nothing to show yet: purchase support is off, or the year has no purchase request at all. */
function isBlank(data: RequestsReportData | undefined, params: RequestsParams): boolean {
  return Boolean(
    data && (!data.purchaseSupport || (data.cards.purchaseRequests === 0 && !filtered(params))),
  );
}

/** Cards, status mix and commitment by vendor and by owner, for every Purchasing tab. */
export function RequestsOverview({ address, onGrid }: { address: ReportAddress; onGrid: boolean }) {
  const { params, report } = useRequests(address, onGrid);
  const data = report.data;
  const failed = report.isError;
  const retry = () => void report.refetch();
  if (isBlank(data, params)) {
    return null;
  }
  return (
    <>
      <CardsRow data={data?.cards} failed={failed} />
      <StatusWidget data={data?.statusMix} failed={failed} onRetry={retry} />
      <CommitmentChart
        widget="byVendor"
        title="Committed by approved purchase requests, by vendor"
        rowLabel="Vendor"
        data={data?.byVendor}
        failed={failed}
        onRetry={retry}
      />
      <CommitmentChart
        widget="byOwner"
        title="Committed by approved purchase requests, by owner"
        rowLabel="Owner"
        data={data?.byOwner}
        failed={failed}
        onRetry={retry}
      />
    </>
  );
}

export interface RequestsTabProps {
  address: ReportAddress;
  year: number;
  /** Where "See GSAP purchase orders" goes. */
  ordersHref: string;
}

/** The Purchase requests tab: the grid, or why there is nothing to list. */
export function RequestsTab({ address, year, ordersHref }: RequestsTabProps) {
  const { params, report, change } = useRequests(address, true);
  const data = report.data;
  if (data && !data.purchaseSupport) {
    return (
      <EmptyState
        icon={<ChartColumnIncreasing />}
        title="Purchase requests aren’t switched on"
        text="An administrator can switch purchase support on in Settings."
      />
    );
  }
  if (isBlank(data, params)) {
    return (
      <EmptyState
        icon={<FileText />}
        title={`No purchase requests in ${year}`}
        text="Purchase requests start from an approved activity’s line items."
        action={<LinkButton to={ordersHref}>See GSAP purchase orders</LinkButton>}
      />
    );
  }
  return (
    <RequestsGrid
      grid={data?.grid}
      covers={data?.financeCovers}
      params={params}
      onParams={change}
      failed={report.isError}
      onRetry={() => void report.refetch()}
    />
  );
}
