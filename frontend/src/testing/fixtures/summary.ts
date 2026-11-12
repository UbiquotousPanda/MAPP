import type { components } from '@/api/generated/schema';

type SummaryReport = components['schemas']['SummaryReport'];
type SummaryLeague = components['schemas']['SummaryLeague'];

const usd = (amount: string) => ({ amount, currency: 'USD' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function state(i: number): 'actual' | 'inProgress' | 'projected' {
  return i < 5 ? 'actual' : i === 5 ? 'inProgress' : 'projected';
}

/** One activity's year: 100.00 a month against a 10,000.00 goal, June in progress. */
export function summaryReport(overrides: Partial<SummaryReport> = {}): SummaryReport {
  return {
    revenue: {
      periodLabel: 'FY 2026',
      actualOrProjected: usd('1200.00'),
      goal: usd('10000.00'),
      performance: 12,
      variance: 'belowPlan',
      goalCoverage: [
        { stage: 'inq', percent: 50 },
        { stage: 'mql', percent: 50 },
        { stage: 'revenue', percent: 50 },
      ],
      trend: MONTHS.map((m, i) => ({
        key: `2026-${String(i + 1).padStart(2, '0')}`,
        label: `${m} 2026`,
        state: state(i),
        actual: i <= 5 ? usd('100.00') : null,
        projected: i >= 5 ? usd('100.00') : null,
        goal: usd('800.00'),
      })),
      trendTotals: {
        actual: usd('600.00'),
        projected: usd('700.00'),
        goal: usd('9600.00'),
        goalAfterYear: null,
      },
    },
    funnel: {
      stages: [
        {
          stage: 'inq',
          actualOrProjected: 120,
          goal: 100,
          performance: 120,
          variance: 'abovePlan',
          plansWithout: 0,
        },
        {
          stage: 'mql',
          actualOrProjected: 24,
          goal: 20,
          performance: 120,
          variance: 'abovePlan',
          plansWithout: 0,
        },
        {
          stage: 'revenue',
          actualOrProjected: usd('1200.00'),
          goal: usd('10000.00'),
          performance: 12,
          variance: 'belowPlan',
          plansWithout: 0,
        },
      ],
      conversions: [{ stage: 'mql', rate: '20.4', goal: '20.0', variance: 'abovePlan' }],
      trend: {
        stage: 'mql',
        periods: MONTHS.map((m, i) => ({
          key: `2026-${String(i + 1).padStart(2, '0')}`,
          label: `${m} 2026`,
          state: state(i),
          rate: '20.0',
          goal: '25.0',
        })),
      },
    },
    categories: [
      { id: 'CAT-1', name: 'Events' },
      { id: 'uncategorised', name: 'Uncategorised' },
    ],
    states: [],
    financeCovers: { plans: 1, of: 1 },
    ...overrides,
  };
}

export function summaryLeague(
  table: SummaryLeague['table'],
  overrides: Partial<SummaryLeague> = {},
): SummaryLeague {
  const money = table === 'revenue' || table === 'cost';
  const value = (amount: string, percent: number) => (money ? usd(amount) : percent);
  return {
    table,
    segment: { id: 'ATTR-R', label: 'Region', level: 'activity' },
    segments: [
      { id: 'ATTR-R', label: 'Region', level: 'activity' },
      { id: 'ATTR-P', label: 'Business unit', level: 'plan' },
    ],
    rows: [
      { key: 'O-1', name: 'North', value: value('600.00', 83), trend: [] },
      { key: 'O-2', name: 'South', value: value('600.00', 83), trend: [] },
    ],
    total: value('1200.00', 83),
    roi: table === 'roi' ? { model: 'Equally distributed', basis: 'actual' } : null,
    reason: null,
    ...overrides,
  };
}
