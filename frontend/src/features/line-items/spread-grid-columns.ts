import type { components } from '@/api/generated/schema';
import { formatMonth } from './line-item-math';

type SpreadGrid = components['schemas']['SpreadGrid'];
type Money = components['schemas']['Money'];

export interface GridColumn {
  key: string;
  /** "Mar 2026", "Q1 2026" or "No dates yet". */
  label: string;
  outsideActivityDates: boolean;
  noDates: boolean;
}

export interface ShownGrid {
  columns: GridColumn[];
  rows: { lineItemId: string; name: string; cells: (Money | null)[]; total: Money }[];
  totals: (Money | null)[];
  total: Money;
}

export function monthColumns(grid: SpreadGrid): ShownGrid {
  return {
    columns: grid.columns.map((column) => ({
      key: column.key,
      label: column.month ? formatMonth(column.month) : 'No dates yet',
      outsideActivityDates: column.outsideActivityDates,
      noDates: column.month === null,
    })),
    rows: grid.rows,
    totals: grid.totals,
    total: grid.total,
  };
}

/** The API's quarterly grid, its columns labelled "Q1 2026". */
export function quarterColumns(grid: SpreadGrid): ShownGrid {
  return {
    ...monthColumns(grid),
    columns: grid.columns.map((column) => ({
      key: column.key,
      label: column.quarter ? column.quarter.replace(/^(\d{4})-(Q\d)$/, '$2 $1') : 'No dates yet',
      outsideActivityDates: column.outsideActivityDates,
      noDates: !column.quarter,
    })),
  };
}
