import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { InlineError } from '@/ui/InlineError/InlineError';
import { ApiError } from '@/api/errors';
import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { FormField } from '@/ui/FormField/FormField';
import { FailureMessage } from '@/ui/FormPanel/FormPanel';
import { problemOf } from '@/ui/FormPanel/problem-of';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { TextField } from '@/ui/TextField/TextField';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { useCopyOptions } from '../api';
import type { PlanCopyOptions, PlanCopyRequest } from '../api';
import { contentsText } from '../plan-text';
import { copyPlanSchema } from '../schemas';
import type { CopyPlanValues } from '../schemas';
import styles from './dialogs.module.css';
import { YearChoice } from './YearChoice';

export interface CopyRefusal {
  problems: FieldProblem[];
  message?: string;
}

export interface CopyPlanDialogProps {
  open: boolean;
  planId: string;
  planName: string;
  /** Answers why it was refused, or null when copied (the caller then opens the copy). */
  onCopy: (request: PlanCopyRequest) => Promise<CopyRefusal | null>;
  onClose: () => void;
}

const DIALOG_FIELDS = ['name', 'year', 'includeContents'] as const;

/** Give it a new `key` each time it opens, so it starts from the suggestion. */
export function CopyPlanDialog({ open, planId, planName, onCopy, onClose }: CopyPlanDialogProps) {
  const options = useCopyOptions(planId, open);
  // What the person changed; until then (null) the dialog shows the API's suggestion. The
  // suggestion is asked again on every opening, so it may arrive after the cached one and replace it.
  const form = useForm<CopyPlanValues>({
    resolver: zodResolver(copyPlanSchema),
    defaultValues: { name: null, year: null, includeContents: true },
    ...CHECK_ON_SAVE,
  });
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  async function copy(loaded: PlanCopyOptions, { name, year, includeContents }: CopyPlanValues) {
    setBusy(true);
    try {
      showRefusal(
        await onCopy({
          name: name ?? loaded.name,
          year: year ?? loaded.sameYear,
          includeContents,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function showRefusal(refusal: CopyRefusal | null) {
    const problems = refusal?.problems ?? [];
    for (const field of DIALOG_FIELDS) {
      const message = problemOf(problems, field);
      if (message) {
        form.setError(field, { message });
      }
    }
    const others = problems.filter((problem) => !DIALOG_FIELDS.some((f) => f === problem.field));
    setFailure(refusal?.message ?? others.map((problem) => problem.message).join(' '));
  }

  function submit() {
    const loaded = options.data;
    if (loaded) {
      void form.handleSubmit((values) => copy(loaded, values))();
    }
  }

  function content() {
    if (options.data) {
      return <CopyFields options={options.data} control={form.control} failure={failure} />;
    }
    if (options.isError) {
      // A plan that is gone stays gone: its message alone, and Cancel closes the dialog.
      return options.error instanceof ApiError && options.error.kind === 'notFound' ? (
        <InlineError>{options.error.message}</InlineError>
      ) : (
        <ErrorState error={options.error} onRetry={() => void options.refetch()} />
      );
    }
    return <Skeleton lines={4} />;
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Copy plan '${planName}'`}
      submitLabel="Copy plan"
      onSubmit={submit}
      busy={busy}
    >
      {content()}
    </FormDialog>
  );
}

interface CopyFieldsProps {
  options: PlanCopyOptions;
  control: Control<CopyPlanValues>;
  failure: string;
}

function CopyFields({ options, control, failure }: CopyFieldsProps) {
  const counts = contentsText(options.contents);

  return (
    // The fields arrive after the dialog has opened, so the name takes the focus when it appears
    // (FormDialog had put it on Copy plan while the options loaded).
    <div className={styles.stack} ref={focusNameOnArrival}>
      {failure && <FailureMessage failure={{ message: failure }} />}
      <FormField
        control={control}
        name="name"
        render={(field) => (
          <TextField
            label="Name of the copy"
            marking="Required"
            maxLength={120}
            {...field}
            value={field.value ?? options.name}
          />
        )}
      />
      <FormField
        control={control}
        name="year"
        render={(field) => (
          <YearChoice
            options={options}
            year={field.value ?? options.sameYear}
            error={field.error}
            onChange={field.onChange}
          />
        )}
      />
      <FormField
        control={control}
        name="includeContents"
        render={({ value, ...field }) => (
          <CheckboxField
            label="Include campaigns, initiatives, activities and line items"
            checked={value}
            hint={counts || 'This plan has nothing inside yet.'}
            {...field}
          />
        )}
      />
    </div>
  );
}

function focusNameOnArrival(node: HTMLDivElement | null) {
  const active = document.activeElement;
  if (node && !(active instanceof HTMLInputElement)) {
    node.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }
}
