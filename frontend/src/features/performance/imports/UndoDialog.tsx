import { useState } from 'react';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { asApiError } from '@/api/errors';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/ui/Toast/useToast';
import { useUndoImport } from './api';
import { countsSentence } from './imports-text';
import type { PerformanceImport } from './api';

/** Undo states what the import did, and what will change, before anything happens. */
export function UndoDialog({ load, onClose }: { load: PerformanceImport; onClose: () => void }) {
  const undo = useUndoImport(load.id);
  const { show } = useToast();
  const [failure, setFailure] = useState<string | null>(null);

  async function confirm() {
    setFailure(null);
    try {
      await undo.mutateAsync();
      show({ message: `Import '${load.fileName}' undone` });
      onClose();
    } catch (error) {
      setFailure(`Nothing was undone. ${asApiError(error).message}`);
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && !undo.isPending && onClose()}
      title={`Undo import '${load.fileName}'?`}
      confirmLabel="Undo import"
      tone="danger"
      busy={undo.isPending}
      onConfirm={() => void confirm()}
    >
      {failure && (
        <InlineAlert tone="danger" role="alert">
          {failure}
        </InlineAlert>
      )}
      <p>{countsSentence(load.counts)}</p>
      <p>
        Its matched and held figures stop counting, and the activities and reports they reach are
        recalculated. Any figures this import replaced come back, and the rows it sent to review are
        closed.
      </p>
      <p>
        The import stays listed as Undone. This can't be reversed; to load the rows again, upload
        the file again.
      </p>
    </ConfirmDialog>
  );
}
