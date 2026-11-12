const DAY_MS = 86_400_000;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** A calendar date ("YYYY-MM-DD") as a whole day number, the same in every time zone. */
export function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

export function dateOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function isDate(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(dayNumber(text));
}

export function monthDays(year: number): number[] {
  return Array.from({ length: 12 }, (_, month) =>
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
}

/** Monday 0 … Sunday 6. */
function weekdayOf(date: string): number {
  return (new Date(dayNumber(date) * DAY_MS).getUTCDay() + 6) % 7;
}

/** The weeks of a month (1–12), Monday to Sunday; null for days of the month before or after. */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const firstDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const first = dayNumber(firstDate);
  const count = monthDays(year)[month - 1] ?? 0;
  const cells: (string | null)[] = [
    ...Array.from({ length: weekdayOf(firstDate) }, () => null),
    ...Array.from({ length: count }, (_, index) => dateOf(first + index)),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function addDays(date: string, days: number): string {
  return dateOf(dayNumber(date) + days);
}

/** The same day `months` later, or the month's last day when it is shorter (31 Jan + 1 → 28 Feb). */
export function addMonths(date: string, months: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const index = year * 12 + month - 1 + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  const last = monthDays(nextYear)[nextMonth - 1] ?? 28;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${nextYear}-${pad(nextMonth)}-${pad(Math.min(day, last))}`;
}

export function longDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${WEEKDAY_NAMES[weekdayOf(date)]} ${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/** Where a key moves the focused day of a date picker (WAI-ARIA date picker dialog); null: not ours. */
export function keyTarget(key: string, shift: boolean, date: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(date, -1);
    case 'ArrowRight':
      return addDays(date, 1);
    case 'ArrowUp':
      return addDays(date, -7);
    case 'ArrowDown':
      return addDays(date, 7);
    case 'Home':
      return addDays(date, -weekdayOf(date));
    case 'End':
      return addDays(date, 6 - weekdayOf(date));
    case 'PageUp':
      return addMonths(date, shift ? -12 : -1);
    case 'PageDown':
      return addMonths(date, shift ? 12 : 1);
    default:
      return null;
  }
}

export function isOutside(date: string, min?: string, max?: string): boolean {
  return Boolean((min && date < min) || (max && date > max));
}
