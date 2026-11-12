import type { components } from '@/api/generated/schema';
import { LinkButton } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import { useFormatters } from '@/format/useFormatters';
import { useAccess } from '@/session/access';
import { useSummaryReport } from '@/features/measure';
import styles from './RevenueCard.module.css';

type Variance = components['schemas']['SummaryVariance'];

// The Summary report's own default address, so the report opens on the same figures.
const ADDRESS: Parameters<typeof useSummaryReport>[0] = {
  year: null,
  plans: [],
  planTypes: [],
  teams: [],
  owners: [],
  activityTypes: [],
  activityStatuses: [],
  attributes: [],
  period: 'month',
  show: null,
  tables: [],
};

const VARIANCE: Record<Variance, { word: string; tone: StatusTone }> = {
  abovePlan: { word: 'Above plan', tone: 'positive' },
  onPlan: { word: 'On plan', tone: 'active' },
  belowPlan: { word: 'Below plan', tone: 'review' },
  noGoal: { word: 'No goal', tone: 'neutral' },
};

const SUMMARY_REPORT_HREF = '/reports/summary';

/** "Are we on track?": revenue against goal from the Summary report, for people who may see reports. */
export function RevenueCard() {
  return useAccess().has('reports.view') ? <RevenueFigures /> : null;
}

function RevenueFigures() {
  const { money } = useFormatters();
  const report = useSummaryReport(ADDRESS, {});
  if (report.isError) {
    return null;
  }
  const revenue = report.data?.revenue;
  const variance = revenue && VARIANCE[revenue.variance];

  return (
    <Card
      title="Revenue this year"
      subtitle="Every plan you can see, against its activities' goals"
      actions={
        <LinkButton to={SUMMARY_REPORT_HREF} size="sm">
          Open Summary report
        </LinkButton>
      }
    >
      {revenue && variance ? (
        <dl className={styles.figures}>
          <div>
            <dt>Actual or projected</dt>
            <dd>{revenue.actualOrProjected ? money(revenue.actualOrProjected) : '—'}</dd>
          </div>
          <div>
            <dt>Revenue goal</dt>
            <dd>{revenue.goal ? money(revenue.goal) : '—'}</dd>
          </div>
          <div>
            <dt>Performance</dt>
            <dd>
              {revenue.performance === null ? '—' : `${revenue.performance}%`}
              <StatusChip tone={variance.tone}>{variance.word}</StatusChip>
            </dd>
          </div>
        </dl>
      ) : (
        <Skeleton lines={2} />
      )}
    </Card>
  );
}
