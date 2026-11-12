import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useUnsavedChanges } from '../useUnsavedChanges';
import { Button } from '../Button/Button';
import { FormErrorSummary } from '../FormErrorSummary/FormErrorSummary';
import { InlineAlert } from '../InlineAlert/InlineAlert';
import type { FieldProblem } from '../FormErrorSummary/FormErrorSummary';
import { SidePanel } from '../SidePanel/SidePanel';
import styles from './FormPanel.module.css';
import type { SaveFailure } from './problem-of';

export interface FormPanelProps {
  title: string;
  description?: string;
  isDirty: boolean;
  saving: boolean;
  problems: FieldProblem[];
  failure: SaveFailure | null;
  onSave: () => void;
  onClose: () => void;
  saveLabel?: string;
  children: ReactNode;
}

/** A side-panel form: Save is never disabled; "Discard changes?" before typed changes are lost. */
export function FormPanel({
  title,
  description,
  isDirty,
  saving,
  problems,
  failure,
  onSave,
  onClose,
  saveLabel = 'Save',
  children,
}: FormPanelProps) {
  const { dialog, confirmDiscard } = useUnsavedChanges(isDirty, title);
  // Save sits in the panel's footer, outside the form; the form attribute connects them.
  const formId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A second Save while saving is ignored; nothing is greyed out.
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
              {saveLabel}
            </Button>
            <Button onClick={() => confirmDiscard(onClose)}>Cancel</Button>
          </>
        }
      >
        <form id={formId} noValidate aria-busy={saving} className={styles.form} onSubmit={submit}>
          {failure && <FailureMessage failure={failure} />}
          <FormErrorSummary errors={problems} />
          {children}
        </form>
      </SidePanel>
      {dialog}
    </>
  );
}

/** A failure that is not about one field, such as a conflict; screen readers hear it at once. */
export function FailureMessage({ failure }: { failure: SaveFailure }) {
  return (
    <InlineAlert tone="danger" role="alert" title={failure.message}>
      {failure.nextStep && <p>{failure.nextStep}</p>}
    </InlineAlert>
  );
}
