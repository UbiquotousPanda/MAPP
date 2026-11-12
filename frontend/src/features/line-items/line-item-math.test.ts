import { describe, expect, it } from 'vitest';
import {
  activityMonths,
  addMonths,
  amountText,
  customGridMonths,
  formatMonth,
  isOutsideDates,
  parseAmount,
} from './line-item-math';

const MAR_MAY = { startDate: '2026-03-01', endDate: '2026-05-31', ongoing: false };
const ONGOING = { startDate: '2026-03-15', endDate: null, ongoing: true };
const NO_DATES = { startDate: null, endDate: null, ongoing: false };

describe('parseAmount and texts', () => {
  it('rounds 1,234.565 to 1,234.57 (edge case "Rounding")', () => {
    expect(parseAmount('1,234.565')).toBe(123_457n);
  });

  it('reads typed amounts and refuses anything else', () => {
    expect(parseAmount('12500')).toBe(1_250_000n);
    expect(parseAmount('12,500.5')).toBe(1_250_050n);
    expect(parseAmount('-50')).toBe(-5_000n);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('ten')).toBeNull();
  });

  it('writes amounts with their code and a minus sign (D-143)', () => {
    expect(amountText(1_086_957n, 'USD')).toBe('$10,869.57');
    expect(amountText(-50_000n, 'USD')).toBe('-$500.00');
    expect(amountText('46000.00', 'EUR')).toBe('€46,000.00');
  });

  it('writes months as people read them', () => {
    expect(formatMonth('2026-03')).toBe('Mar 2026');
    // In the person's date format.
    expect(formatMonth('2026-03', 'MM/DD/YYYY')).toBe('03/2026');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('activity months and spreads (FR-017, FR-021)', () => {
  it('lists the calendar months of the dates', () => {
    expect(activityMonths(MAR_MAY)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(
      activityMonths({ startDate: '2026-12-15', endDate: '2027-01-02', ongoing: false }),
    ).toEqual(['2026-12', '2027-01']);
  });

  it('has only the start month for an ongoing activity and none without dates', () => {
    expect(activityMonths(ONGOING)).toEqual(['2026-03']);
    expect(activityMonths(NO_DATES)).toEqual([]);
    expect(activityMonths({ startDate: '2026-03-01', endDate: null, ongoing: false })).toEqual([]);
  });

  it('marks months outside the dates', () => {
    expect(isOutsideDates('2026-02', MAR_MAY)).toBe(true);
    expect(isOutsideDates('2026-04', MAR_MAY)).toBe(false);
    expect(isOutsideDates('2026-06', MAR_MAY)).toBe(true);
    expect(isOutsideDates('2027-06', ONGOING)).toBe(false);
    expect(isOutsideDates('2026-02', ONGOING)).toBe(true);
    expect(isOutsideDates('2026-02', NO_DATES)).toBe(false);
  });
});

describe('customGridMonths (D-152)', () => {
  it('starts with the activity months and keeps stored months outside them', () => {
    expect(customGridMonths(MAR_MAY, 2026)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(customGridMonths(MAR_MAY, 2026, ['2026-02', '2026-04'])).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
    ]);
  });

  it('runs to December of the plan year for an ongoing activity (FR-021)', () => {
    expect(
      customGridMonths({ startDate: '2026-10-01', endDate: null, ongoing: true }, 2026),
    ).toEqual(['2026-10', '2026-11', '2026-12']);
  });

  it('offers the plan year without dates', () => {
    const months = customGridMonths(NO_DATES, 2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });
});
