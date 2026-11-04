import { ChartColumnIncreasing } from 'lucide-react';
import { useSearchParams } from 'react-router';
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

function Widgets({ address }: { address: ReportAddress }) {
  const [search, setSearch] = useSearchParams();
  const params = readRequestsParams(search);
  const report = useRequestsReport(address, params);
  const data = report.data;
  const retry = () => void report.refetch();
  const failed = report.isError;
  const change = (changes: Partial<RequestsParams>) =>
    setSearch(writeRequestsParams(search, { ...params, page: 1, ...changes }));
  if (data && !data.purchaseSupport) {
    return (
      <EmptyState
        icon={<ChartColumnIncreasing />}
        title="Purchase requests aren’t switched on"
        text="An administrator can switch purchase support on in Settings."
      />
    );
  }
  return (
    <>
      <CardsRow data={data?.cards} failed={failed} onRetry={retry} />
      <StatusWidget data={data?.statusMix} failed={failed} onRetry={retry} />
      <CommitmentChart
        widget="byVendor"
        title="Commitment by vendor, by delivery month"
        rowLabel="Vendor"
        data={data?.byVendor}
        failed={failed}
        onRetry={retry}
      />
      <CommitmentChart
        widget="byOwner"
        title="Commitment by owner, by delivery month"
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
      {(_frame, address) => <Widgets address={address} />}
    </ReportFrame>
  );
}
