import { useState } from 'react';
import { InlineError } from '@/ui/InlineError/InlineError';
import type { ApiError } from '@/api/errors';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/ui/Toast/useToast';
import { asApiError } from '@/api/errors';
import type { BinItem } from './bin-text';
import { emptiedMessage, emptyBinText } from './purge-text';
import { useEmptyBin } from './api';
import styles from './dialogs.module.css';

export interface EmptyBinDialogProps {
  /** Every entry the page lists — not only those the search shows. */
  items: BinItem[];
  onClose: () => void;
}

/** Deletes only the entries the person saw here, even when someone added one meanwhile. */
export function EmptyBinDialog({ items, onClose }: EmptyBinDialogProps) {
  const emptyBin = useEmptyBin();
  const { show } = useToast();
  const [failure, setFailure] = useState<ApiError | null>(null);

  const confirm = () => {
    setFailure(null);
    emptyBin.mutate(
      items.map((item) => item.id),
      {
        onSuccess: (result) => {
          onClose();
          show({ message: emptiedMessage(result.count) });
        },
        onError: (error) => setFailure(asApiError(error)),
      },
    );
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title="Empty the recycle bin?"
      confirmLabel="Empty recycle bin"
      tone="danger"
      busy={emptyBin.isPending}
      onConfirm={confirm}
    >
      <div className={styles.sentences}>
        <p>{emptyBinText(items)}</p>
        <p>This can&apos;t be undone.</p>
        {failure && <InlineError>{failure.message}</InlineError>}
      </div>
    </ConfirmDialog>
  );
}
