import type { ReactNode } from 'react';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import { formatWhole } from '@/format/decimal';
import { localDate } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { usePerformancePanel } from './api';
import type {
  MetricFigure,
  PanelSource,
  PerformancePanel as Panel,
  RevenueFigure,
  StageFigure,
} from './api';
import styles from './DataSourcesArea.module.css';
import { ProjectionMonths } from './ProjectionMonths';
import { STAGE_WORDS } from '../performance-text';

const GATE = 'Approve the activity to see performance data.';

/** Why a figure is empty: the API's stated reason, never inferred and never a sample value. */
const REASON_WORDS: Record<string, string> = {
  noSource: 'No active data source supplies this figure.',
  noGoal: 'No goal is set for this figure.',
  noData: 'No data has arrived yet.',
  stale: 'The data source is stale.',
  failed: 'The last load failed.',
  notApproved: GATE,
};

const METRIC_WORDS: Record<string, string> = {
  sessions: 'Sessions',
  visits: 'Visits',
  engagementTouches: 'Engagement touches',
};
const FRESHNESS_TONE: Record<string, StatusTone> = {
  current: 'positive',
  stale: 'review',
  failed: 'problem',
  inactive: 'neutral',
};

/** The activity's Performance area: figures gated until the activity counts as approved. */
export function PerformancePanel({ activityId }: { activityId: string }) {
  const panel = usePerformancePanel(activityId);
  return (
    <Card title="Performance">
      {panel.isError ? (
        <ErrorState error={panel.error} onRetry={() => void panel.refetch()} />
      ) : panel.data ? (
        <PanelBody panel={panel.data} />
      ) : (
        <Skeleton lines={4} />
      )}
    </Card>
  );
}

function PanelBody({ panel }: { panel: Panel }) {
  if (panel.state === 'notApproved') {
    return <p className={styles.notice}>{GATE}</p>;
  }
  return (
    <div className={styles.stack}>
      <StageTable stages={panel.stages} revenue={panel.revenue} />
      <ProjectionMonths stages={panel.stages} revenue={panel.revenue} />
      {panel.projection && <ProjectionNote stamp={panel.projection} />}
      {panel.webMetrics.length > 0 && <WebMetrics metrics={panel.webMetrics} />}
      {panel.sources.length > 0 && <Sources sources={panel.sources} />}
    </div>
  );
}

function StageTable({ stages, revenue }: { stages: StageFigure[]; revenue: RevenueFigure }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Stage</th>
          <th scope="col">Goal</th>
          <th scope="col">Actual</th>
          <th scope="col">Projected</th>
          <th scope="col">Conversion</th>
        </tr>
      </thead>
      <tbody>
        {stages.map((stage) => (
          <tr key={stage.stage}>
            <th scope="row">{STAGE_WORDS[stage.stage] ?? stage.stage}</th>
            <td className={styles.numeric}>
              {stage.goal === null ? '—' : formatWhole(stage.goal)}
            </td>
            <ActualCell reason={stage.reason}>
              {stage.actual === null ? '—' : formatWhole(stage.actual)}
            </ActualCell>
            <td className={styles.numeric}>
              {stage.projected === null
                ? (REASON_WORDS[stage.projectedReason] ?? '—')
                : formatWhole(stage.projected)}
            </td>
            <td className={styles.numeric}>
              {stage.conversion === null ? '—' : `${stage.conversion.toFixed(1)} %`}
            </td>
          </tr>
        ))}
        <RevenueRow revenue={revenue} />
      </tbody>
    </table>
  );
}

function RevenueRow({ revenue }: { revenue: RevenueFigure }) {
  const { money } = useFormatters();
  return (
    <tr>
      <th scope="row">Revenue</th>
      <td className={styles.numeric}>{revenue.goal ? money(revenue.goal) : '—'}</td>
      <ActualCell reason={revenue.reason}>
        {revenue.actual ? money(revenue.actual) : '—'}
        {revenue.excludedCount > 0 && (
          <span className={styles.reason}> · {revenue.excludedCount} excluded without a rate</span>
        )}
      </ActualCell>
      <td className={styles.numeric}>
        {revenue.projected
          ? money(revenue.projected)
          : (REASON_WORDS[revenue.projectedReason] ?? '—')}
      </td>
      <td className={styles.numeric}>—</td>
    </tr>
  );
}

/** A missing actual states its own reason; the goal and the projection beside it still show. */
function ActualCell({ reason, children }: { reason: string; children: ReactNode }) {
  if (reason) {
    return <td className={styles.reason}>{REASON_WORDS[reason] ?? reason}</td>;
  }
  return <td className={styles.numeric}>{children}</td>;
}

/** Every projected figure names the model behind it and when its parameters last changed. */
function ProjectionNote({ stamp }: { stamp: NonNullable<Panel['projection']> }) {
  const { date } = useFormatters();
  return (
    <p className={styles.notice}>
      Projected from {stamp.modelName}, last changed {date(localDate(stamp.modelChangedAt))}.
    </p>
  );
}

function WebMetrics({ metrics }: { metrics: MetricFigure[] }) {
  return (
    <div>
      {metrics.map((metric) => (
        <p key={metric.metric} className={styles.notice}>
          {METRIC_WORDS[metric.metric] ?? metric.metric}:{' '}
          {metric.months.map((m) => `${m.month} · ${formatWhole(m.value)}`).join(', ')}
        </p>
      ))}
    </div>
  );
}

function Sources({ sources }: { sources: PanelSource[] }) {
  const { date } = useFormatters();
  return (
    <p className={styles.notice}>
      {sources.map((source) => (
        <span key={source.sourceId} className={styles.alias}>
          {source.sourceName}{' '}
          <StatusChip tone={FRESHNESS_TONE[source.freshness] ?? 'neutral'}>
            {source.freshness}
          </StatusChip>
          {source.dataThrough && <> · through {date(source.dataThrough)}</>}
        </span>
      ))}
    </p>
  );
}
