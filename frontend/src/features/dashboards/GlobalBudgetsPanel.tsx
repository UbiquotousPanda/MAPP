import { Link } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { Card } from '@/ui/Card/Card';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import type { DashboardGlobalBudget } from './api';
import styles from './Dashboards.module.css';

interface GlobalBudgetsPanelProps {
  budgets: DashboardGlobalBudget[];
}

export function GlobalBudgetsPanel({ budgets }: GlobalBudgetsPanelProps) {
  const { money } = useFormatters();
  return (
    <Card title="Global budgets">
      {budgets.length === 0 ? (
        <p className={styles.note}>No global budgets for this year.</p>
      ) : (
        <ScrollBox label="Global budgets">
          <table className={cx(dataTable.table, styles.table)}>
            <caption className="visually-hidden">
              Global budgets of the year and their allocations
            </caption>
            <thead>
              <tr>
                {['Global budget', 'Amount', 'Allocated', 'Unallocated', 'Planned cost'].map(
                  (title, i) => (
                    <th key={title} scope="col" className={i > 0 ? dataTable.numeric : undefined}>
                      {title}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <th scope="row">
                    <Link to={`/budgets/${b.id}`}>{b.name}</Link>
                  </th>
                  <td className={dataTable.numeric}>{money(b.amount)}</td>
                  <td className={dataTable.numeric}>{money(b.allocated)}</td>
                  <td className={dataTable.numeric}>
                    {money(b.unallocated)}
                    {b.overAllocated && <span className={styles.problem}> · Over-allocated</span>}
                  </td>
                  <td className={dataTable.numeric}>{money(b.plannedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      )}
    </Card>
  );
}
