/** Where things go on the Calendar: bars on the years' timeline and the Today line, by calendar day. */
import { dayNumber, monthDays } from '@/ui/DatePicker/calendar';
import type { AllWorkRow } from './all-work-types';

/** The days from 1 January of `from` to 31 December of `to` (one year, or a range of up to 5). */
function rangeSpan(from: number, to: number = from): { first: number; last: number; days: number } {
  const first = dayNumber(`${from}-01-01`);
  const last = dayNumber(`${to}-12-31`);
  return { first, last, days: last - first + 1 };
}

export function yearDays(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const year = from + index;
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  });
}

export function quarterDays(year: number): number[] {
  const months = monthDays(year);
  return [0, 3, 6, 9].map((first) =>
    months.slice(first, first + 3).reduce((sum, days) => sum + days, 0),
  );
}

export interface Bar {
  left: number;
  width: number;
  continuesFrom: boolean;
  continuesInto: boolean;
  ongoing: boolean;
}

/** In per cent of the timeline's width, cut at its edges; plans and records without dates have none. */
export function barOf(
  row: Pick<AllWorkRow, 'level' | 'startDate' | 'endDate' | 'ongoing'>,
  year: number,
  yearTo: number = year,
): Bar | null {
  const { startDate, endDate } = row;
  if (row.level === 'plan' || !startDate || (!endDate && !row.ongoing)) {
    return null;
  }
  const { first, last, days } = rangeSpan(year, yearTo);
  const start = dayNumber(startDate);
  const end = endDate && !row.ongoing ? dayNumber(endDate) : last;
  if (end < first || start > last) {
    return null;
  }
  const from = Math.max(start, first);
  const to = Math.min(end, last);
  return {
    left: ((from - first) / days) * 100,
    width: ((to - from + 1) / days) * 100,
    continuesFrom: start < first,
    continuesInto: !row.ongoing && end > last,
    ongoing: Boolean(row.ongoing),
  };
}

export function hasNoDates(row: Pick<AllWorkRow, 'level' | 'startDate' | 'endDate' | 'ongoing'>) {
  return (
    (row.level === 'campaign' || row.level === 'initiative' || row.level === 'activity') &&
    (!row.startDate || (!row.endDate && !row.ongoing))
  );
}

/** The Today line in per cent of the timeline's width, at the middle of the day. */
export function todayOffset(today: string, year: number, yearTo: number = year): number | null {
  const { first, last, days } = rangeSpan(year, yearTo);
  const day = dayNumber(today);
  if (day < first || day > last) {
    return null;
  }
  return ((day - first + 0.5) / days) * 100;
}

/** Whether an activity runs on a day: from its start to its end, or to the year's end when ongoing. */
export function runsOn(
  row: Pick<AllWorkRow, 'startDate' | 'endDate' | 'ongoing'>,
  date: string,
  year: number,
): boolean {
  const { startDate, endDate } = row;
  if (!startDate || (!endDate && !row.ongoing)) {
    return false;
  }
  const end = endDate && !row.ongoing ? endDate : `${year}-12-31`;
  return startDate <= date && date <= end;
}
