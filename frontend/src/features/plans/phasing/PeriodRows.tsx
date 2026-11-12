import { FieldHelpTip } from '@/features/settings';
import { formatCents, toCents } from '@/format/decimal';
import { formatMoney } from '@/format/intl';
import styles from './BudgetByMonth.module.css';
import type { BudgetByMonthPeriods } from './api';
import { overBy } from './phasing-math';

type Money = { amount: string; currency: string };

/** "$50,000.00" like every other amount on the page; "—" for none and for zero. */
function amount(value: Money | null | undefined): string {
  return value && toCents(value.amount) !== 0n ? formatMoney(value.amount, value.currency) : '—';
}

/** The sum of a row's amounts; "—" when none of them is set. */
function totalOf(values: (Money | null)[]): string {
  const set = values.filter((value): value is Money => value !== null);
  const [first] = set;
  if (!first) {
    return '—';
  }
  const cents = set.reduce((total, value) => total + toCents(value.amount), 0n);
  return amount({ amount: formatCents(cents), currency: first.currency });
}

function RowHead({ label, helpKey }: { label: string; helpKey?: string }) {
  return (
    <th scope="row">
      {label}
      {helpKey && <FieldHelpTip helpKey={helpKey} label={label} />}
    </th>
  );
}

export function PeriodRow({
  label,
  helpKey,
  values,
  extra,
  extraCount = 0,
  empty,
}: {
  label: string;
  helpKey?: string;
  values: (Money | null)[];
  extra?: Money[];
  extraCount?: number;
  /** Shown across the periods when the row has no amounts ("Not phased"). */
  empty?: string;
}) {
  const columns = extra?.length ?? extraCount;
  if (empty) {
    return (
      <tr>
        <RowHead label={label} helpKey={helpKey} />
        <td colSpan={values.length + columns + 1} className={styles.muted}>
          {empty}
        </td>
      </tr>
    );
  }
  const total = totalOf([...values, ...(extra ?? [])]);
  return (
    <tr>
      <RowHead label={label} helpKey={helpKey} />
      {values.map((value, index) => (
        <td key={index} className={styles.number}>
          {amount(value)}
        </td>
      ))}
      {extra
        ? extra.map((value, index) => (
            <td key={`extra-${index}`} className={styles.number}>
              {amount(value)}
            </td>
          ))
        : Array.from({ length: extraCount }, (_, index) => (
            <td key={`extra-${index}`} className={styles.number}>
              —
            </td>
          ))}
      <td className={`${styles.number} ${styles.total}`}>{total}</td>
    </tr>
  );
}

/** Budget − planned cost per period; red "Over by …" where the API says the period is over. */
export function DifferenceRow({
  periods,
  extraCount,
}: {
  periods: BudgetByMonthPeriods;
  extraCount: number;
}) {
  return (
    <tr>
      <RowHead label="Difference" helpKey="phasing.difference" />
      {periods.difference.map((value, index) => {
        const over = periods.over[index];
        const currency = periods.budget[index]?.currency ?? value?.currency ?? 'USD';
        const by = over
          ? overBy(
              periods.budget[index]?.amount,
              periods.plannedCost[index]?.amount,
              periods.allocated?.[index]?.amount,
            )
          : 0n;
        return (
          <td key={index} className={`${styles.number} ${over ? styles.over : ''}`}>
            {over && by > 0n ? `Over by ${formatMoney(formatCents(by), currency)}` : amount(value)}
          </td>
        );
      })}
      {Array.from({ length: extraCount }, (_, index) => (
        <td key={`extra-${index}`} className={styles.number}>
          —
        </td>
      ))}
      <td className={`${styles.number} ${styles.total}`}>{totalOf(periods.difference)}</td>
    </tr>
  );
}
