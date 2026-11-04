import type { components } from '@/api/generated/schema';
import type { LeagueTableKey } from './schemas';

type Stage = components['schemas']['SummaryStageKey'];

export const STAGE: Record<Stage, string> = { inq: 'INQ', mql: 'MQL', revenue: 'Revenue' };

export const STATE_TEXT: Record<string, string> = {
  noPlans: 'There are no plans you may see for this year.',
  nothingMatches: 'No activities match the filters.',
  noFinancialAccess: 'Cost and ROI leave out the plans whose financial data you may not see.',
  noGoals: 'The activities in view have no goals yet, so there is nothing to compare against.',
  noPerformanceData: 'No performance data has arrived yet.',
  notApproved: 'The activities in view are not approved yet, so their performance data is held.',
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
