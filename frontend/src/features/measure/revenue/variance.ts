import type { components } from '@/api/generated/schema';

type Variance = components['schemas']['SummaryVariance'];

/** 048-C1's words for the API's variance; the word comes from the server, never from the number. */
const VARIANCE_WORDS: Record<Variance, string> = {
  abovePlan: 'Above plan',
  onPlan: 'On plan',
  belowPlan: 'Below plan',
  noGoal: 'No goal',
};

export function varianceText(variance: Variance): string {
  return VARIANCE_WORDS[variance];
}

export function performanceText(performance: number | null, variance: Variance): string {
  return performance === null ? '—' : `${performance}% · ${varianceText(variance)}`;
}
