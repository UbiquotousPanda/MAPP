import type { components } from '@/api/generated/schema';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';

type Stage = components['schemas']['SummaryStageKey'];
type Variance = components['schemas']['SummaryVariance'];

export const STAGE: Record<Stage, string> = { inq: 'INQ', mql: 'MQL', revenue: 'Revenue' };

export const STATE_TEXT: Record<string, string> = {
  noPlans: 'There are no plans you may see for this year.',
  nothingMatches: 'No activities match the filters.',
  noFinancialAccess: 'Cost and ROI leave out the plans whose financial data you may not see.',
  noGoals: 'The activities in view have no goals yet, so there is nothing to compare against.',
  noPerformanceData: 'No actuals yet — the figures below are projections from each plan’s model.',
  notApproved: 'The activities in view are not approved yet, so their performance data is held.',
};

export const VARIANCE_TONE: Record<Variance, StatusTone> = {
  abovePlan: 'positive',
  onPlan: 'active',
  belowPlan: 'review',
  noGoal: 'neutral',
};

export function percentText(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export function rateText(value: string | null): string {
  return value === null ? '—' : `${value}%`;
}
