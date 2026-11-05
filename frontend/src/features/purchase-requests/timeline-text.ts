import type { PurchaseRequestTimelineStep } from './api';

export const TIMELINE_TITLE = 'Timeline';
export const TIMELINE_SUBTITLE = 'Where this purchase request is, from Created to Paid';

/** "3 Nov 2026, 09:00 · Sara Lee · 4500001234": only the parts the records give. */
export function stepFact(step: PurchaseRequestTimelineStep, when: string | null): string {
  return [when, step.by?.name, step.detail].filter(Boolean).join(' · ') || 'Done';
}
