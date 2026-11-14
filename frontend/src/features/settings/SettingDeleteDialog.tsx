import { useState } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import type { components } from '@/api/generated/schema';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useUndoableDelete } from '@/ui/useUndoableDelete';
import { SETTING_NOUNS } from './settings-nouns';
import type { SettingKind } from './settings-nouns';
import { useFailureToast } from './useSettingStatus';

type DeleteResult = components['schemas']['DeleteResult'];
type Usage = components['schemas']['Usage'];

export interface SettingDeleteDialogProps {
  kind: SettingKind;
  name: string;
  usage: Usage;
  active: boolean;
  /** Where it goes: "It moves to the recycle bin; you can restore it." unless given. */
  deleteText?: string;
  /** DELETE the record; answers its recycle-bin entry for Undo. */
  remove: () => Promise<DeleteResult>;
  /** Sets it inactive (with its own message); answers whether that worked. */
  setInactive: () => Promise<boolean>;
  invalidate: QueryKey[];
  onDeleted?: () => void;
  onClose: () => void;
}

// A record in use offers Set inactive instead (only Close when inactive already); a delete the
// API refuses as in use switches to that state with the API's message.
export function SettingDeleteDialog({
  kind,
  name,
  usage,
  active,
  deleteText = 'It moves to the recycle bin; you can restore it.',
  remove,
  setInactive,
  invalidate,
  onDeleted,
  onClose,
}: SettingDeleteDialogProps) {
  const nouns = SETTING_NOUNS[kind];
  // The API's message when it found the record in use after all.
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const afterDelete = useUndoableDelete({ invalidate });
  const showFailure = useFailureToast();
  const inUse = usage.inUse || refusal !== null;

  async function removeAndTell() {
    try {
      afterDelete(await remove());
      onDeleted?.();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'inUse') {
        setRefusal(error.message);
        return;
      }
      onClose();
      showFailure(error, () => void removeAndTell());
    }
  }

  async function run(action: () => Promise<unknown>) {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  let title: string;
  let text: string;
  let confirm: { label: string; danger: boolean; onClick: () => void } | null;
  if (!inUse) {
    title = `Delete ${nouns.noun} '${name}'?`;
    text = deleteText;
    confirm = {
      label: `Delete ${nouns.noun}`,
      danger: true,
      onClick: () => void run(removeAndTell),
    };
  } else if (active) {
    title = `'${name}' is in use`;
    text = `${refusal ?? `${usage.summary} — set it inactive instead.`} ${nouns.inactiveEffect}`;
    confirm = {
      label: 'Set inactive',
      danger: false,
      onClick: () =>
        void run(async () => {
          await setInactive();
          onClose();
        }),
    };
  } else {
    title = `'${name}' is in use`;
    text = `${usage.summary}, so it can't be deleted. It's already inactive.`;
    confirm = null;
  }

  return confirm ? (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      confirmLabel={confirm.label}
      tone={confirm.danger ? 'danger' : undefined}
      busy={busy}
      onConfirm={confirm.onClick}
    >
      <p>{text}</p>
    </ConfirmDialog>
  ) : (
    <ConfirmDialog open onOpenChange={(open) => !open && onClose()} title={title} acknowledgeOnly>
      <p>{text}</p>
    </ConfirmDialog>
  );
}
