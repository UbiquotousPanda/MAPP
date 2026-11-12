import type { components } from '@/api/generated/schema';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import type { LeagueTableKey } from './schemas';

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

export const LEAGUE_COLUMN: Record<LeagueTableKey, string> = {
  revenue: 'Revenue',
  performance: 'Performance',
  cost: 'Actual cost',
  roi: 'ROI',
};

export const LEAGUE_TITLE: Record<LeagueTableKey, string> = {
  revenue: 'Top revenue',
  performance: 'Top performance',
  cost: 'Top actual cost',
  roi: 'Top ROI',
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
