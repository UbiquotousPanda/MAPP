import { describe, expect, it } from 'vitest';
import type { components } from '@/api/generated/schema';
import { quarterColumns } from './spread-grid-columns';

type SpreadGrid = components['schemas']['SpreadGrid'];

const usd = (amount: string) => ({ amount, currency: 'USD' });

describe('quarterColumns (FR-003, D-061)', () => {
  it('labels the quarters the API added up and keeps the No dates yet column', () => {
    const grid: SpreadGrid = {
      columns: [
        { key: '2026-Q1', month: null, quarter: '2026-Q1', outsideActivityDates: true },
        { key: '2026-Q2', month: null, quarter: '2026-Q2', outsideActivityDates: false },
        { key: 'noDates', month: null, outsideActivityDates: false },
      ],
      rows: [
        { lineItemId: 'L-1', name: 'Fee', cells: [usd('1.00'), null, null], total: usd('1.00') },
      ],
      totals: [usd('1.00'), null, null],
      total: usd('1.00'),
    };
    const quarters = quarterColumns(grid);
    expect(quarters.columns.map((c) => c.label)).toEqual(['Q1 2026', 'Q2 2026', 'No dates yet']);
    expect(quarters.columns.map((c) => [c.outsideActivityDates, c.noDates])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
    expect(quarters.totals).toEqual(grid.totals);
  });
});
