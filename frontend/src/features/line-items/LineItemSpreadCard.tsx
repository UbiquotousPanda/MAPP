import { Card } from '@/ui/Card/Card';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import { toCents } from '@/format/decimal';
import { amountText, formatMonth, moneyText } from './line-item-math';
import type { LineItem } from './api';
import {
  customTotalText,
  NOT_SPREAD_YET,
  OUTSIDE_TIP,
  SECTION_SPREAD,
  SPREAD_LABELS,
} from './line-item-text';
import styles from './LineItemPage.module.css';

/** The months of the spread, amounts right-aligned under their header (design system §5.4). */
export function LineItemSpreadCard({ lineItem }: { lineItem: LineItem }) {
  const { spread } = lineItem;
  const code = lineItem.currency.code;
  return (
    <Card title={SECTION_SPREAD} subtitle={SPREAD_LABELS[spread.method]}>
      {spread.state === 'notSpread' ? (
        <p className={styles.note}>{NOT_SPREAD_YET}</p>
      ) : (
        <div className={styles.stack}>
          <div className={dataTable.scroll}>
            <table className={cx(dataTable.table, styles.months)}>
              <caption className="visually-hidden">Month amounts</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className={dataTable.numeric}>
                    {`Planned cost (${code})`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {spread.months.map((month) => (
                  <tr key={month.month}>
                    <td>
                      {formatMonth(month.month)}
                      {month.outsideActivityDates && (
                        <span className={styles.outside}> — {OUTSIDE_TIP}</span>
                      )}
                    </td>
                    <td className={dataTable.numeric}>{moneyText(month.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {spread.method === 'custom' && spread.customTotal && (
            <p className={styles.note}>{customTotal(lineItem)}</p>
          )}
        </div>
      )}
    </Card>
  );
}

/** "€12,000.00 of €10,000.00 spread — €2,000.00 too much" for a saved custom spread. */
function customTotal(lineItem: LineItem): string {
  const sum = lineItem.spread.customTotal;
  if (!sum) {
    return '';
  }
  const total = toCents(sum.amount);
  const cost = toCents(lineItem.plannedCost.amount);
  const difference = cost - total;
  const code = lineItem.currency.code;
  return customTotalText(amountText(total, code), amountText(cost, code), {
    sign: difference === 0n ? 0 : difference > 0n ? 1 : -1,
    amount: amountText(difference < 0n ? -difference : difference, code),
  });
}
