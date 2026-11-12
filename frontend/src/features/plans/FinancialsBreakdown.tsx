import { Link } from 'react-router';
import type { components } from '@/api/generated/schema';
import { plural } from '@/format/text';
import { recordHref } from '@/ui/record-links';
import { useFormatters } from '@/format/useFormatters';
import dataTable from '@/ui/Table/Table.module.css';
import styles from './RecordFinancials.module.css';

type FinancialRecordView = components['schemas']['FinancialRecordView'];
type Level = components['schemas']['AttributeLevel'];
type Figures = components['schemas']['FinancialFigures'];

const BREAKDOWN_HEADING: Record<Level, string> = {
  plan: 'By campaign',
  campaign: 'By initiative',
  initiative: 'By activity',
  activity: 'By line item',
  lineItem: '',
  purchaseRequest: '',
  purchaseRequestLine: '',
};

/** "By campaign" / "By initiative" / "By activity": each child with its four figures. */
export function FinancialsBreakdown({
  view,
  planId,
}: {
  view: FinancialRecordView;
  planId: string;
}) {
  const { money } = useFormatters();
  const heading = BREAKDOWN_HEADING[view.record.type];
  return (
    <div className={dataTable.scroll}>
      <table className={dataTable.table}>
        <caption className={styles.tableTitle}>{heading}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" className={dataTable.numeric}>
              Committed
            </th>
            <th scope="col" className={dataTable.numeric}>
              Invoiced
            </th>
            <th scope="col" className={dataTable.numeric}>
              Paid
            </th>
            <th scope="col" className={dataTable.numeric}>
              Accrued
            </th>
          </tr>
        </thead>
        <tbody>
          {view.breakdown.map(({ record, figures }) => (
            <tr key={record.id}>
              <th scope="row">
                <Link to={recordHref(record.type, record.id, planId)}>{record.name}</Link>
                <AboveMarker figures={figures} />
              </th>
              <td className={dataTable.numeric}>{money(figures.committed)}</td>
              <td className={dataTable.numeric}>{money(figures.invoiced)}</td>
              <td className={dataTable.numeric}>{money(figures.paid)}</td>
              <td className={dataTable.numeric}>{money(figures.accrued)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A row's red marker: "Committed above planned cost on 1 line item", or above its own planned cost. */
function AboveMarker({ figures }: { figures: Figures }) {
  const count = figures.lineItemsAbovePlanned;
  const text =
    count > 0
      ? `Committed above planned cost on ${plural(count, 'line item')}`
      : figures.committedAbovePlanned && 'Committed above planned cost';
  return text ? <span className={styles.rowProblem}>{` · ${text}`}</span> : null;
}
