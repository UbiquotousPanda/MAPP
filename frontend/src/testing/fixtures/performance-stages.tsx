import { FunnelBody } from '@/features/measure/funnel/FunnelReport';
import { RevenueBody } from '@/features/measure/revenue/RevenueReport';
import { ReportFrame } from '@/features/measure/shared';

/** Performance's stages alone in the report frame, for the tests of their own widgets. */
export function RevenueStage() {
  return (
    <ReportFrame report="performance">
      {(frame, address) => <RevenueBody frame={frame} address={address} />}
    </ReportFrame>
  );
}

export function FunnelStage({ stage = 'inq' }: { stage?: 'inq' | 'mql' }) {
  return (
    <ReportFrame report="performance">
      {(frame, address) => <FunnelBody frame={frame} address={address} stage={stage} />}
    </ReportFrame>
  );
}
