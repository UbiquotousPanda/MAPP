/** Budget by month answers for tests (016 data-model §3.3, §3.4): P-1004, a GBP plan of 2027. */
import type { BudgetByMonth, BudgetByMonthPeriods, BudgetPhasing } from '@/features/plans';

export const gbp = (amount: string) => ({ amount, currency: 'GBP' });

/** Twelve times the same amount. */
export function twelve(amount: string | null) {
  return Array.from({ length: 12 }, () => (amount === null ? null : gbp(amount)));
}

/** Twelve times the same amount, never empty. */
export function twelveAmounts(amount: string) {
  return Array.from({ length: 12 }, () => gbp(amount));
}

/** The totals the API adds up for a row of these periods. */
const TOTALS: BudgetByMonthPeriods['totals'] = {
  budget: gbp('600000.00'),
  plannedCost: gbp('480000.00'),
  difference: gbp('120000.00'),
  allocated: gbp('360000.00'),
};

const NOT_PHASED: BudgetByMonthPeriods['totals'] = {
  ...TOTALS,
  budget: null,
  plannedCost: gbp('485000.00'),
  difference: null,
};

export function periods(overrides: Partial<BudgetByMonthPeriods> = {}): BudgetByMonthPeriods {
  return {
    budget: twelve('50000.00'),
    plannedCost: twelveAmounts('40000.00'),
    difference: twelve('10000.00'),
    allocated: twelve('30000.00'),
    over: Array<boolean>(12).fill(false),
    overBy: twelve(null),
    totals: TOTALS,
    ...overrides,
  };
}

export function quarters(overrides: Partial<BudgetByMonthPeriods> = {}): BudgetByMonthPeriods {
  const four = (amount: string | null) =>
    Array.from({ length: 4 }, () => (amount === null ? null : gbp(amount)));
  const fourAmounts = (amount: string) => Array.from({ length: 4 }, () => gbp(amount));
  return {
    budget: four('150000.00'),
    plannedCost: fourAmounts('120000.00'),
    difference: four('30000.00'),
    allocated: four('90000.00'),
    over: Array<boolean>(4).fill(false),
    overBy: four(null),
    totals: TOTALS,
    ...overrides,
  };
}

export function budgetByMonth(overrides: Partial<BudgetByMonth> = {}): BudgetByMonth {
  return {
    planId: 'P-1004',
    year: 2027,
    currency: 'GBP',
    months: Array.from({ length: 12 }, (_, index) => `2027-${String(index + 1).padStart(2, '0')}`),
    rows: [
      {
        recordType: 'plan',
        recordId: 'P-1004',
        parentId: null,
        name: 'FY2027 Lubricants UK & Ireland',
        method: 'evenly',
        months: periods(),
        quarters: quarters(),
        otherYears: null,
        noDates: null,
        childrenNotPhased: 1,
        negativeBalanceCount: 0,
      },
      {
        recordType: 'campaign',
        recordId: 'C-1005',
        parentId: 'P-1004',
        name: 'Helix UK',
        method: 'none',
        months: periods({ budget: twelve(null), difference: twelve(null), totals: NOT_PHASED }),
        quarters: quarters({
          budget: [null, null, null, null],
          difference: [null, null, null, null],
          totals: NOT_PHASED,
        }),
        otherYears: gbp('5000.00'),
        noDates: null,
        childrenNotPhased: 0,
        negativeBalanceCount: 0,
      },
    ],
    ...overrides,
  };
}

export function phasing(overrides: Partial<BudgetPhasing> = {}): BudgetPhasing {
  return {
    method: 'evenly',
    months: [],
    monthly: twelveAmounts('50000.00'),
    total: gbp('600000.00'),
    problem: null,
    evenly: twelveAmounts('50000.00'),
    ...overrides,
  };
}
