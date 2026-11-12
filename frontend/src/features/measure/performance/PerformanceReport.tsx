import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { ReportFrame } from '../shared';
import type { ReportAddress, ReportFrameData } from '../shared';
import { useOwnParam } from '../shared/useOwnParam';
import { FunnelBody } from '../funnel/FunnelReport';
import { useCategoryFilter } from '../revenue/CategorySelect';
import { RevenueBody } from '../revenue/RevenueReport';
import { useSummaryReport } from '../summary/api';
import { ConversionTrend, FunnelSection } from '../summary/FunnelSection';
import { RevenueSection } from '../summary/RevenueSection';
import { stageOf } from './stage';
import { StagePicker } from './StagePicker';
import styles from './Performance.module.css';

/** Performance against goal (059 US1): the year's overview, then one stage's cards, series and ranked list. */
export function PerformanceReport() {
  const category = useCategoryFilter();
  return (
    <ReportFrame report="performance" filters={category}>
      {(frame, address) => <PerformanceBody frame={frame} address={address} />}
    </ReportFrame>
  );
}

function PerformanceBody({ frame, address }: { frame: ReportFrameData; address: ReportAddress }) {
  const [category] = useOwnParam('category');
  const [param] = useOwnParam('stage');
  const { stage, unknown } = stageOf(param);
  const summary = useSummaryReport(address, category ? { category } : {});
  return (
    <div className={styles.body}>
      {summary.data ? (
        <>
          <RevenueSection revenue={summary.data.revenue} states={summary.data.states} />
          <FunnelSection funnel={summary.data.funnel} />
        </>
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <div aria-label="Loading the overview">
          <Skeleton lines={4} height="24px" />
        </div>
      )}
      <div className={styles.stage}>
        {unknown && (
          <InlineAlert tone="info" title="This view changed">
            The stage it asked for is no longer offered, so Revenue is shown.
          </InlineAlert>
        )}
        <StagePicker stage={stage} address={address} />
        {stage === 'revenue' ? (
          <RevenueBody frame={frame} address={address} />
        ) : (
          <FunnelBody
            frame={frame}
            address={address}
            stage={stage}
            trend={summary.data && <ConversionTrend trend={summary.data.funnel.trend} />}
          />
        )}
      </div>
    </div>
  );
}
