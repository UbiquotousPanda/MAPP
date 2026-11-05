import { describe, expect, it } from 'vitest';
import { budgetCheck, overBudgetWarnings, overLimitMessages } from './overspend-check';

const usd = (amount: string) => ({ amount, currency: 'USD' });
const PLANNED = usd('120000.00');

describe('037 FR-015 budgetCheck', () => {
  it.each([
    [
      'Warn never refuses, and warns before saving',
      'warn',
      '100,000',
      '150000.00',
      null,
      'This takes the planned cost 20,000.00 USD over its budget of 100,000.00 USD.',
    ],
    ['at the planned cost is within it', 'refuse', '120,000', '150000.00', null, null],
    [
      'lowered below the planned cost is refused',
      'refuse',
      '100,000',
      '150000.00',
      "The planned cost is 120,000.00 USD; this budget refuses overspending, so it can't be lower than that.",
      null,
    ],
    [
      'typed where there was none is refused',
      'refuse',
      '1',
      null,
      "The planned cost is 120,000.00 USD; this budget refuses overspending, so it can't be lower than that.",
      null,
    ],
    [
      'already over and kept is only noted',
      'refuse',
      '100,000',
      '100000.00',
      null,
      'The planned cost is already over this budget by 20,000.00 USD. Anything that adds cost will be refused until it is back within the budget.',
    ],
    ['no budget typed has nothing to go over', 'refuse', '', '150000.00', null, null],
  ] as const)('%s', (_name, mode, typed, stored, error, note) => {
    expect(budgetCheck({ mode, typed, stored, planned: PLANNED, tolerancePercent: 0 })).toEqual({
      error,
      note,
    });
  });

  it('has nothing to say without a planned cost (a new record)', () => {
    expect(budgetCheck({ mode: 'refuse', typed: '1', stored: null, planned: null })).toEqual({
      error: null,
      note: null,
    });
  });
});

describe('demo-mvp #4 budgetCheck tolerance', () => {
  it('only warns within the tolerance of a Refuse budget', () => {
    expect(
      budgetCheck({
        mode: 'refuse',
        typed: '110,000',
        stored: '150000.00',
        planned: PLANNED,
        tolerancePercent: 10,
      }),
    ).toEqual({
      error: null,
      note: 'This takes the planned cost 10,000.00 USD over its budget of 110,000.00 USD.',
    });
  });

  it('refuses beyond the tolerance', () => {
    expect(
      budgetCheck({
        mode: 'refuse',
        typed: '100,000',
        stored: '150000.00',
        planned: PLANNED,
        tolerancePercent: 10,
      }).error,
    ).not.toBeNull();
  });

  it('leaves refusing to the API while the tolerance is not loaded, and warns', () => {
    expect(
      budgetCheck({ mode: 'refuse', typed: '100,000', stored: '150000.00', planned: PLANNED }),
    ).toEqual({
      error: null,
      note: 'This takes the planned cost 20,000.00 USD over its budget of 100,000.00 USD.',
    });
  });
});

const refuseLimit = (type: string, id: string, name: string, left: string) => ({
  budget: { type, id, name },
  mode: 'refuse' as const,
  amount: usd('20000.00'),
  leftToPlan: usd(left),
  leftBeforeRefusing: usd(left),
});

describe('demo-mvp #3 overBudgetWarnings', () => {
  const warn = {
    ...refuseLimit('campaign', 'C-1001', 'Helix launch', '5000.00'),
    mode: 'warn' as const,
  };
  const tolerant = {
    ...refuseLimit('plan', 'P-1001', 'Lubricants', '5000.00'),
    leftBeforeRefusing: usd('7000.00'),
  };

  it('warns of a Warn budget, and a Refuse one within the tolerance, without refusing', () => {
    expect(overBudgetWarnings([warn, tolerant], null, '6,000')).toEqual([
      "This takes campaign 'Helix launch' 1,000.00 USD over its budget of 20,000.00 USD.",
      "This takes plan 'Lubricants' 1,000.00 USD over its budget of 20,000.00 USD.",
    ]);
    expect(overLimitMessages([warn, tolerant], null, '6,000')).toEqual([]);
  });

  it('refuses, and no longer only warns, beyond the tolerance', () => {
    expect(overLimitMessages([tolerant], null, '7,000.01')).toHaveLength(1);
    expect(overBudgetWarnings([tolerant], null, '7,000.01')).toEqual([]);
  });
});

describe('037 FR-014 overLimitMessages', () => {
  const limits = [
    refuseLimit('campaign', 'C-1001', 'Helix launch', '5000.00'),
    refuseLimit('plan', 'P-1001', 'Lubricants', '-100.00'),
  ];

  it('names every budget a raise would take over, with the overage', () => {
    expect(overLimitMessages(limits, '10000.00', '16,000')).toEqual([
      "This is 1,000.00 USD over the budget of campaign 'Helix launch', which refuses overspending.",
      "This is 6,100.00 USD over the budget of plan 'Lubricants', which refuses overspending.",
    ]);
  });

  it('allows keeping or lowering the cost, even under a budget already over', () => {
    expect(overLimitMessages(limits, '10000.00', '10,000')).toEqual([]);
    expect(overLimitMessages(limits, '10000.00', '9,000')).toEqual([]);
  });

  it('counts a new activity from nothing, and ignores text that is not an amount', () => {
    expect(overLimitMessages(limits.slice(0, 1), null, '5,000.01')).toHaveLength(1);
    expect(overLimitMessages(limits, null, 'abc')).toEqual([]);
  });
});
