import { ChartColumnIncreasing, FileText } from 'lucide-react';
import { useAddressParams } from '@/ui/useAddressParams';
import { LinkButton } from '@/ui/Button/Button';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { ReportFrame } from '../shared';
import type { ReportAddress } from '../shared';
import { useRequestsReport } from './api';
import { CardsRow } from './CardsRow';
import { CommitmentChart } from './CommitmentChart';
import { RequestsGrid } from './RequestsGrid';
import { readRequestsParams, writeRequestsParams } from './schemas';
import type { RequestsParams } from './schemas';
import { StatusWidget } from './StatusWidget';

function Widgets({ address, year }: { address: ReportAddress; year: number }) {
  const [search, setSearch] = useAddressParams();
  const params = readRequestsParams(search);
  const report = useRequestsReport(address, params);
  const data = report.data;
  const retry = () => void report.refetch();
  const failed = report.isError;
  const change = (changes: Partial<RequestsParams>) =>
    setSearch(writeRequestsParams(search, { ...params, page: 1, ...changes }));
  const filtered = Boolean(
    params.q || params.vendors.length || params.requestOwners.length || params.statuses.length,
  );
  if (data && !data.purchaseSupport) {
    return (
      <EmptyState
        icon={<ChartColumnIncreasing />}
        title="Purchase requests aren’t switched on"
        text="An administrator can switch purchase support on in Settings."
      />
    );
  }
  if (data && data.cards.purchaseRequests === 0 && !filtered) {
    return (
      <EmptyState
        icon={<FileText />}
        title={`No purchase requests in ${year}`}
        text="Purchase requests start from an approved activity’s line items."
        action={
          <LinkButton to="/reports/gsap-link?tab=orders">See GSAP purchase orders</LinkButton>
        }
      />
    );
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
      <RequestsGrid
        grid={data?.grid}
        covers={data?.financeCovers}
        params={params}
        onParams={change}
        failed={failed}
        onRetry={retry}
      />
    </>
  );
}

export function PurchaseRequestsReport() {
  return (
    <ReportFrame report="purchaseRequests">
      {(frame, address) => <Widgets address={address} year={frame.filter.year} />}
    </ReportFrame>
  );
}
