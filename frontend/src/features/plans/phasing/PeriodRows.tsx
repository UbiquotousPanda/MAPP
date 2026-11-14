import { FieldHelpTip } from '@/features/settings';
import { toCents } from '@/format/decimal';
import { formatMoney } from '@/format/intl';
import dataTable from '@/ui/Table/Table.module.css';
import styles from './BudgetByMonth.module.css';
import type { BudgetByMonthPeriods } from './api';

type Money = { amount: string; currency: string };

/** "$50,000.00" like every other amount on the page; "—" for none and for zero. */
function amount(value: Money | null | undefined): string {
  return value && toCents(value.amount) !== 0n ? formatMoney(value.amount, value.currency) : '—';
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
  total,
  extra,
  extraCount = 0,
  empty,
}: {
  label: string;
  helpKey?: string;
  values: (Money | null)[];
  /** The row's total, added up by the API. */
  total: Money | null | undefined;
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
  return (
    <tr>
      <RowHead label={label} helpKey={helpKey} />
      {values.map((value, index) => (
        <td key={index} className={dataTable.numeric}>
          {amount(value)}
        </td>
      ))}
      {extra
        ? extra.map((value, index) => (
            <td key={`extra-${index}`} className={dataTable.numeric}>
              {amount(value)}
            </td>
          ))
        : Array.from({ length: extraCount }, (_, index) => (
            <td key={`extra-${index}`} className={dataTable.numeric}>
              —
            </td>
          ))}
      <td className={`${dataTable.numeric} ${styles.total}`}>{amount(total)}</td>
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
        const by = periods.overBy[index];
        return (
          <td key={index} className={`${dataTable.numeric} ${over ? styles.over : ''}`}>
            {over && by && toCents(by.amount) > 0n
              ? `Over by ${formatMoney(by.amount, by.currency)}`
              : amount(value)}
          </td>
        );
      })}
      {Array.from({ length: extraCount }, (_, index) => (
        <td key={`extra-${index}`} className={dataTable.numeric}>
          —
        </td>
      ))}
      <td className={`${dataTable.numeric} ${styles.total}`}>
        {amount(periods.totals.difference)}
      </td>
    </tr>
  );
}
