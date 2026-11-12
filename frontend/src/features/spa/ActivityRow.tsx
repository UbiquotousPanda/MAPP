import { Link, useNavigate } from 'react-router';
import { useFormatters } from '@/format/useFormatters';
import { ActionsMenu } from '@/ui/ActionsMenu/ActionsMenu';
import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import { ActivityStatusChip } from '@/ui/ActivityStatusChip/ActivityStatusChip';
import { DisclosureButton } from '@/ui/DisclosureButton/DisclosureButton';
import dataTable from '@/ui/Table/Table.module.css';
import { recordHref } from '@/ui/record-links';
import type { SpaActivityRow } from './api';
import { ACTIVITIES, percentText } from './spa-text';
import styles from './Spa.module.css';

interface ActivityRowProps {
  row: SpaActivityRow;
  planId: string;
  expanded: boolean;
  onToggle: () => void;
}

/** One activity of the table, then its line items while it is open. */
export function ActivityRow({ row, planId, expanded, onToggle }: ActivityRowProps) {
  const { money } = useFormatters();
  return (
    <>
      <tr>
        <td>
          <DisclosureButton
            expanded={expanded}
            label={`${expanded ? 'Hide' : 'Show'} the line items of ${row.name}`}
            onClick={onToggle}
          />
        </td>
        <th scope="row" className={dataTable.nameCell}>
          <Link to={recordHref('activity', row.id, planId)}>{row.name}</Link>
        </th>
        <td>{row.campaign.name}</td>
        <td className={styles.nowrap}>{row.owner ?? '—'}</td>
        <td>{row.activityType ?? '—'}</td>
        <td>{row.channel ?? '—'}</td>
        <td className={styles.nowrap}>{row.startQuarter ?? '—'}</td>
        <td>
          <ActivityStatusChip status={row.status} />
        </td>
        <td className={dataTable.numeric}>{money(row.plannedCost)}</td>
        <td className={dataTable.numeric}>{money(row.committed)}</td>
        <td className={dataTable.numeric}>{money(row.actualSpend)}</td>
        <td
          className={row.overspend ? `${dataTable.numeric} ${styles.problem}` : dataTable.numeric}
        >
          {percentText(row.variancePercent, true)}
        </td>
        <td>
          <RaiseMenu row={row} />
        </td>
      </tr>
      {expanded && <LineItemRows row={row} />}
    </>
  );
}

function LineItemRows({ row }: { row: SpaActivityRow }) {
  const { money } = useFormatters();
  if (row.lineItems.length === 0) {
    return (
      <tr className={styles.subRow}>
        <td />
        <td colSpan={12}>{ACTIVITIES.noLineItems}</td>
      </tr>
    );
  }
  return row.lineItems.map((item) => (
    <tr key={item.id} className={styles.subRow}>
      <td />
      <th scope="row" colSpan={7}>
        <Link to={recordHref('lineItem', item.id)}>{item.name}</Link>
      </th>
      <td className={dataTable.numeric}>{money(item.plannedCost)}</td>
      <td className={dataTable.numeric}>{money(item.committed)}</td>
      <td className={dataTable.numeric}>{money(item.actualSpend)}</td>
      <td colSpan={2} />
    </tr>
  ));
}

/** Raise purchase request (013 FR-022): one of the activity's line items, then 032's form. */
function RaiseMenu({ row }: { row: SpaActivityRow }) {
  const navigate = useNavigate();
  const { available, reason } = row.raisePurchaseRequest;
  const items: ActionsMenuItem[] = available
    ? row.lineItems.map((item) => ({
        label: `${ACTIVITIES.raise} for ${item.name}`,
        onSelect: () =>
          void navigate(`/purchase-requests/new?${new URLSearchParams({ lineItemId: item.id })}`),
      }))
    : [{ label: ACTIVITIES.raise, onSelect: () => undefined, disabled: true, hint: reason }];
  return <ActionsMenu label={row.name} items={items} />;
}
