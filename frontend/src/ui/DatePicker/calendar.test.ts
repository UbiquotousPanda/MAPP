import { describe, expect, it } from 'vitest';
import { addMonths, keyTarget, longDate, monthDays, monthWeeks } from './calendar';

describe('the calendar core of the date picker and All work’s month', () => {
  it('knows the days of each month, leap years included', () => {
    expect(monthDays(2026)).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    expect(monthDays(2028)[1]).toBe(29);
  });

  it('lays out a month Monday to Sunday (010 FR-028)', () => {
    const weeks = monthWeeks(2026, 10);

    // 1 Oct 2026 is a Thursday.
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('moves a month on to the last day of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
  });

  it('names a day in full for screen readers', () => {
    expect(longDate('2026-11-12')).toBe('Thursday 12 November 2026');
  });

  // Thursday 12 November 2026.
  it.each([
    ['ArrowLeft', false, '2026-11-11'],
    ['ArrowRight', false, '2026-11-13'],
    ['ArrowUp', false, '2026-11-05'],
    ['ArrowDown', false, '2026-11-19'],
    ['Home', false, '2026-11-09'],
    ['End', false, '2026-11-15'],
    ['PageUp', false, '2026-10-12'],
    ['PageDown', false, '2026-12-12'],
    ['PageUp', true, '2025-11-12'],
    ['PageDown', true, '2027-11-12'],
    ['Tab', false, null],
  ])('moves the focused day on %s (shift %s) to %s (D-424)', (key, shift, expected) => {
    expect(keyTarget(key, shift, '2026-11-12')).toBe(expected);
  });
});
