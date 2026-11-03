import type { components } from '@/api/generated/schema';
import type { LeagueTableKey } from './schemas';

type Variance = components['schemas']['SummaryVariance'];
type Stage = components['schemas']['SummaryStageKey'];

export const VARIANCE: Record<Variance, string> = {
  abovePlan: 'Above plan',
  onPlan: 'On plan',
  belowPlan: 'Below plan',
  noGoal: 'No goal',
};

export const STAGE: Record<Stage, string> = { inq: 'INQ', mql: 'MQL', revenue: 'Revenue' };

export const STATE_TEXT: Record<string, string> = {
  nothingMatches: 'No activities match the filters.',
  noGoals: 'The activities in view have no goals yet, so there is nothing to compare against.',
  noPerformanceData: 'No performance data has arrived yet.',
};

export const LEAGUE_TITLE: Record<LeagueTableKey, string> = {
  revenue: 'Revenue',
  performance: 'Performance',
  cost: 'Actual cost',
  roi: 'ROI',
};

export function percentText(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export function rateText(value: string | null): string {
  return value === null ? '—' : `${value}%`;
}
