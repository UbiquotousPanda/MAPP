import type { PurchaseRequestTimelineStep } from './api';

export const TIMELINE_TITLE = 'Timeline';
export const TIMELINE_SUBTITLE = 'Where this purchase request is, from Created to Paid';

/** "3 Nov 2026, 09:00 · Sara Lee · 4500001234": only the parts the records give. */
export function stepFact(
  step: PurchaseRequestTimelineStep,
  when: string | null,
  reapprovedOn: string | null = null,
): string {
  const reapproved = reapprovedOn ? `change re-approved ${reapprovedOn}` : '';
  return [when, step.by?.name, step.detail, reapproved].filter(Boolean).join(' · ') || 'Done';
}
