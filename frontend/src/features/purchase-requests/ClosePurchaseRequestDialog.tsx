import { InlineError } from '@/ui/InlineError/InlineError';
import { asApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useToast } from '@/ui/Toast/useToast';
import { formatMoneyText } from '@/format/decimal';
import dataTable from '@/ui/Table/Table.module.css';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useClosePreview, useClosePurchaseRequest } from './api';
import type { PurchaseRequest, PurchaseRequestClosePreview } from './api';
import {
  CLOSE_COLUMNS,
  CLOSE_FINAL,
  CLOSE_INTRO,
  CLOSE_PR,
  closedToast,
  closeTitle,
  releasedText,
} from './page-text';
import styles from './PurchaseRequestPage.module.css';

export interface ClosePurchaseRequestDialogProps {
  purchaseRequest: PurchaseRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Close purchase request (032 FR-041, FR-055): per line what it is now, what GSAP invoiced, what it
 * becomes and what is released, asked of the server before anything changes.
 */
export function ClosePurchaseRequestDialog({
  purchaseRequest,
  open,
  onOpenChange,
}: ClosePurchaseRequestDialogProps) {
  const { show } = useToast();
  const preview = useClosePreview(purchaseRequest.id, open);
  const close = useClosePurchaseRequest(purchaseRequest.id);
  const ready = preview.data?.available ? preview.data : null;

  function confirm(version: number) {
    close.mutate(version, {
      onSuccess: () => {
        show({ message: closedToast(purchaseRequest.name) });
        onOpenChange(false);
      },
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={closeTitle(purchaseRequest.name)}
      size="lg"
      cancelLabel="Cancel"
      {...(ready
        ? { confirmLabel: CLOSE_PR, onConfirm: () => confirm(ready.version), busy: close.isPending }
        : { acknowledgeOnly: true })}
    >
      {preview.data ? (
        preview.data.available ? (
          <ClosePreviewLines preview={preview.data} />
        ) : (
          <p>{preview.data.reason}</p>
        )
      ) : preview.isError ? (
        <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
      ) : (
        <Skeleton lines={4} />
      )}
      {close.error && <InlineError>{asApiError(close.error).message}</InlineError>}
    </ConfirmDialog>
  );
}

function ClosePreviewLines({ preview }: { preview: PurchaseRequestClosePreview }) {
  return (
    <div className={styles.dialogText}>
      <p>{CLOSE_INTRO}</p>
      <div className={styles.scroll}>
        <table className={dataTable.table}>
          <thead>
            <tr>
              <th scope="col">{CLOSE_COLUMNS.line}</th>
              <th scope="col" className={dataTable.numeric}>
                {CLOSE_COLUMNS.amount}
              </th>
              <th scope="col" className={dataTable.numeric}>
                {CLOSE_COLUMNS.invoiced}
              </th>
              <th scope="col" className={dataTable.numeric}>
                {CLOSE_COLUMNS.closed}
              </th>
              <th scope="col" className={dataTable.numeric}>
                {CLOSE_COLUMNS.released}
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <th scope="row">{`${line.lineItemId} · ${line.hxKey}`}</th>
                <td className={dataTable.numeric}>{formatMoneyText(line.amount)}</td>
                <td className={dataTable.numeric}>{formatMoneyText(line.invoiced)}</td>
                <td className={dataTable.numeric}>{formatMoneyText(line.closedAmount)}</td>
                <td className={dataTable.numeric}>{formatMoneyText(line.released)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{releasedText(preview.releasedDisplay)}</p>
      <p>{CLOSE_FINAL}</p>
    </div>
  );
}
