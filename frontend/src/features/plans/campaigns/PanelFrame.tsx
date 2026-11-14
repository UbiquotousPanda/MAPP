import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { Button } from '@/ui/Button/Button';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FormErrorSummary } from '@/ui/FormErrorSummary/FormErrorSummary';
import { FailureMessage } from '@/ui/FormPanel/FormPanel';
import { SidePanel } from '@/ui/SidePanel/SidePanel';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import type { SaveFailure } from '@/ui/FormPanel/problem-of';
import { ApiError } from '@/api/errors';
import { useUnsavedChanges } from '@/ui/useUnsavedChanges';
import styles from './PanelFrame.module.css';
import { BACK_TO_PLAN, CANCEL, SAVE, SAVE_AND_ADD_ANOTHER } from './texts';

export interface RecordFormPanelProps {
  title: string;
  description?: string;
  isDirty: boolean;
  /** A save is on its way; another Save is ignored meanwhile (nothing is greyed out). */
  saving: boolean;
  problems: FieldProblem[];
  failure: SaveFailure | null;
  fieldId: (field: string) => string;
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
  /** Cancel: after "Discard changes?" when something was typed. */
  onCancel: () => void;
  /** Close, Escape or a click beside the panel: after the same question. */
  onClose: () => void;
  children: ReactNode;
  dialogs?: ReactNode;
}

/** Asks "Discard changes?" before typed values are lost; Save is never disabled. */
export function RecordFormPanel({
  title,
  description,
  isDirty,
  saving,
  problems,
  failure,
  fieldId,
  onSave,
  onSaveAndAddAnother,
  onCancel,
  onClose,
  children,
  dialogs,
}: RecordFormPanelProps) {
  const { dialog, confirmDiscard } = useUnsavedChanges(isDirty);
  const formId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saving) {
      onSave();
    }
  }

  return (
    <>
      <SidePanel
        open
        onOpenChange={(open) => {
          if (!open) {
            confirmDiscard(onClose);
          }
        }}
        title={title}
        description={description}
        footer={
          <>
            <Button type="submit" form={formId} variant="primary">
              {SAVE}
            </Button>
            {onSaveAndAddAnother && (
              <Button onClick={() => !saving && onSaveAndAddAnother()}>
                {SAVE_AND_ADD_ANOTHER}
              </Button>
            )}
            <Button onClick={() => confirmDiscard(onCancel)}>{CANCEL}</Button>
          </>
        }
      >
        <form id={formId} noValidate aria-busy={saving} className={styles.form} onSubmit={submit}>
          {failure && <FailureMessage failure={failure} />}
          <FormErrorSummary errors={problems} fieldId={fieldId} />
          {children}
        </form>
      </SidePanel>
      {dialogs}
      {dialog}
    </>
  );
}

export interface StatePanelProps {
  title: string;
  closeTo: string;
  children: ReactNode;
}

/** A panel that shows a state instead of a record: loading, a failure, or a record that is gone. */
export function StatePanel({ title, closeTo, children }: StatePanelProps) {
  const navigate = useNavigate();
  const close = () => void navigate(closeTo);
  return (
    <SidePanel
      open
      onOpenChange={(open) => !open && close()}
      title={title}
      footer={<Button onClick={close}>{BACK_TO_PLAN}</Button>}
    >
      {children}
    </SidePanel>
  );
}

export function PanelLoading() {
  return (
    <div className={styles.loading} aria-busy="true">
      <Skeleton height="20px" width="60%" />
      <Skeleton lines={4} />
      <Skeleton lines={3} />
    </div>
  );
}

/** A record that is gone (404) says so with the API's message; other failures offer Try again. */
export function PanelFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.kind === 'notFound') {
    return <GoneMessage message={error.message} />;
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}

export function GoneMessage({ message }: { message: string }) {
  return (
    <InlineAlert tone="danger" role="alert">
      {message}
    </InlineAlert>
  );
}
