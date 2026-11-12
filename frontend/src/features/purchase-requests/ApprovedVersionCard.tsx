import { Card } from '@/ui/Card/Card';
import { formatMoneyText } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import dataTable from '@/ui/Table/Table.module.css';
import { ScrollBox } from '@/ui/ScrollBox/ScrollBox';
import type { PurchaseRequest, PurchaseRequestVersion } from './api';
import { Detail, DetailsList } from './Details';
import { APPROVED_VERSION_TITLE, approvedOnText, inactive } from './page-text';
import { FIELD_LABELS } from './purchase-request-text';
import styles from './PurchaseRequestPage.module.css';

/**
 * The last approved values, shown while a change of the approved PR is in review (032 FR-036,
 * FR-037): they stay in force until the change is approved, or come back when it is declined.
 */
export function ApprovedVersionCard({ purchaseRequest }: { purchaseRequest: PurchaseRequest }) {
  const version = purchaseRequest.approvedVersion;
  if (!purchaseRequest.changePending || !version) {
    return null;
  }
  return <VersionCard version={version} />;
}

function VersionCard({ version }: { version: PurchaseRequestVersion }) {
  const { date, dateTime } = useFormatters();
  return (
    <Card title={APPROVED_VERSION_TITLE} subtitle={approvedOnText(dateTime(version.approvedAt))}>
      <div className={styles.stack}>
        <DetailsList label={APPROVED_VERSION_TITLE}>
          <Detail label={FIELD_LABELS.name}>{version.name}</Detail>
          <Detail label={FIELD_LABELS.owner}>
            {version.owner ? inactive(version.owner.name, version.owner.active) : null}
          </Detail>
          <Detail label={FIELD_LABELS.moaApprover}>
            {version.moaApprover
              ? inactive(version.moaApprover.name, version.moaApprover.active)
              : null}
          </Detail>
          <Detail label={FIELD_LABELS.amount} numeric>
            {formatMoneyText(version.amountDisplay)}
          </Detail>
        </DetailsList>
        <ScrollBox label={`${APPROVED_VERSION_TITLE}: lines`}>
          <table className={dataTable.table}>
            <caption className="visually-hidden">{`${APPROVED_VERSION_TITLE}: lines`}</caption>
            <thead>
              <tr>
                <th scope="col">{FIELD_LABELS.lineItem}</th>
                <th scope="col" className={dataTable.numeric}>
                  {FIELD_LABELS.lineAmount}
                </th>
                <th scope="col">{FIELD_LABELS.deliveryDate}</th>
                <th scope="col" className={dataTable.numeric}>
                  {FIELD_LABELS.overallLimit}
                </th>
              </tr>
            </thead>
            <tbody>
              {version.lines.map((line) => (
                <tr key={line.id}>
                  <th scope="row">{`${line.lineItemId} · ${line.hxKey}`}</th>
                  <td className={dataTable.numeric}>{formatMoneyText(line.amount)}</td>
                  <td>{date(line.deliveryDate)}</td>
                  <td className={dataTable.numeric}>
                    {line.overallLimit ? formatMoneyText(line.overallLimit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBox>
      </div>
    </Card>
  );
}
