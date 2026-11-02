// The Measure demo plan the end-to-end seed loads (go run ./cmd/seed -measure, #48), by the names the reports show.
// Only Alex Morgan and Carlos Mendes see it (All markets); every other persona sees the demo story as before.

export const MEASURE_PLAN = 'FY2026 Measure demo – Lubricants Benelux';

export const SEES_MEASURE_PLAN = 'alex.morgan@shell.com';

export const MEASURE_WAITING_FOR_SWBS = {
  under48Hours: 'Retargeting media',
  days2To5: 'Social media, second half',
  days5To10: 'Webinar platform',
  over10Days: 'Social media, first half',
} as const;

export const MEASURE_PURCHASE_REQUESTS = {
  created: 'PR for Social media, second half',
  submitted: 'PR for Webinar speaker fees',
  inReview: 'PR for Search media, first half – extra flights',
  declined: 'PR for Search media, second half – trial',
  waitingForGsap: 'PR for Search media, second half',
  ordered: 'PR for Search media, first half',
  closed: 'PR for Case study production',
} as const;

export const MEASURE_ORDERED_LINE_ITEMS = [
  'Search media, first half',
  'Case study production',
] as const;
