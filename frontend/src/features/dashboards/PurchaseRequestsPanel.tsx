import { useFormatters } from '@/format/useFormatters';
import { Card } from '@/ui/Card/Card';
import dataTable from '@/ui/Table/Table.module.css';
import { cx } from '@/ui/cx';
import type { DashboardPurchaseRequests } from './api';
import { word } from './dashboard-text';
import styles from './Dashboards.module.css';

interface PurchaseRequestsPanelProps {
  purchaseRequests: DashboardPurchaseRequests;
}

export function PurchaseRequestsPanel({ purchaseRequests }: PurchaseRequestsPanelProps) {
  const { money } = useFormatters();
  if (!purchaseRequests.available) {
    return (
      <Card title="Purchase requests">
        <p className={styles.note}>Purchase requests are switched off in Settings.</p>
      </Card>
    );
  }
  if (purchaseRequests.count === 0) {
    return (
      <Card title="Purchase requests">
        <p className={styles.note}>No purchase requests on these plans yet.</p>
      </Card>
    );
  }
  return (
    <Card
      title="Purchase requests"
      subtitle={`${purchaseRequests.waitingForGsap} approved and waiting for GSAP`}
    >
      <table className={cx(dataTable.table, styles.table)}>
        <caption>Purchase requests on these plans by status</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col" className={dataTable.numeric}>
              Purchase requests
            </th>
            <th scope="col" className={dataTable.numeric}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {purchaseRequests.byStatus.map((row) => (
            <tr key={row.status}>
              <th scope="row">{word(row.status)}</th>
              <td className={dataTable.numeric}>{row.count}</td>
              <td className={dataTable.numeric}>{money(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={dataTable.total}>
            <th scope="row">Total</th>
            <td className={dataTable.numeric}>{purchaseRequests.count}</td>
            <td className={dataTable.numeric}>{money(purchaseRequests.amount)}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
