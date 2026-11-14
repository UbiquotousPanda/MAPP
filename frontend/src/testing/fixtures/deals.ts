import type { components } from '@/api/generated/schema';

type ActivityDeals = components['schemas']['ActivityDeals'];
type Deal = components['schemas']['Deal'];
type DealActivity = components['schemas']['DealActivity'];

const usd = (amount: string) => ({ amount, currency: 'USD' });
const plan = { planId: 'P-1012', planName: 'FY2026 Measure demo – Lubricants Benelux' };

export const HELIX: DealActivity = {
  id: 'A-1039',
  name: 'Helix search and social, first half',
  ...plan,
};
export const CASE_STUDIES: DealActivity = { id: 'A-1040', name: 'Tellus case studies', ...plan };
export const WEBINARS: DealActivity = { id: 'A-1041', name: 'Tellus webinar series', ...plan };

const EQUALLY = {
  key: 'equallyDistributed',
  name: 'Equally distributed',
  description: 'Every activity of the journey gets the same share.',
} as const;

/** The Measure demo's two journeys as the webinar series sees them (D-400, 058 US1 scenario 1). */
export function webinarDeals(overrides: Partial<ActivityDeals> = {}): ActivityDeals {
  return {
    activity: WEBINARS,
    year: 2026,
    model: EQUALLY,
    comparison: null,
    credited: usd('18702.90'),
    comparisonCredited: null,
    booked: null,
    reason: '',
    heldFacts: 0,
    withoutRate: 0,
    total: 2,
    page: 1,
    size: 25,
    deals: [dealB(), dealC()],
    ...overrides,
  };
}

export function dealB(): Deal {
  return {
    id: 'PF-1009',
    source: 'Measure demo feed',
    reference: 'MD-009',
    date: '2026-03-06',
    bookedOn: CASE_STUDIES,
    amount: usd('24000.00'),
    usd: usd('24000.00'),
    rate: null,
    journey: 'shared',
    steps: [
      {
        activity: HELIX,
        date: '2026-01-14',
        kinds: ['inq'],
        share: usd('12000.00'),
        comparisonShare: null,
        thisActivity: false,
      },
      {
        activity: WEBINARS,
        date: '2026-03-02',
        kinds: ['mql'],
        share: usd('12000.00'),
        comparisonShare: null,
        thisActivity: true,
      },
    ],
    share: usd('12000.00'),
    comparisonShare: null,
  };
}

export function dealC(): Deal {
  return {
    id: 'PF-1013',
    source: 'Measure demo feed',
    reference: 'MD-013',
    date: '2026-03-09',
    bookedOn: HELIX,
    amount: { amount: '18500.00', currency: 'EUR' },
    usd: usd('20108.70'),
    rate: '0.92',
    journey: 'shared',
    steps: [
      {
        activity: CASE_STUDIES,
        date: '2026-01-22',
        kinds: ['inq'],
        share: usd('6702.90'),
        comparisonShare: null,
        thisActivity: false,
      },
      {
        activity: CASE_STUDIES,
        date: '2026-02-12',
        kinds: ['mql'],
        share: usd('6702.90'),
        comparisonShare: null,
        thisActivity: false,
      },
      {
        activity: WEBINARS,
        date: '2026-03-03',
        kinds: ['mql'],
        share: usd('6702.90'),
        comparisonShare: null,
        thisActivity: true,
      },
    ],
    share: usd('6702.90'),
    comparisonShare: null,
  };
}

/** Helix's deal without a journey, which stays where it was booked (US1 scenario 2). */
export function dealA(): Deal {
  return {
    id: 'PF-1014',
    source: 'Measure demo feed',
    reference: 'MD-014',
    date: '2026-02-20',
    bookedOn: HELIX,
    amount: usd('42000.00'),
    usd: usd('42000.00'),
    rate: null,
    journey: 'none',
    steps: [],
    share: usd('42000.00'),
    comparisonShare: null,
  };
}
