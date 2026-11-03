import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { asApiError } from '@/api/errors';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { TextField } from '@/ui/TextField/TextField';
import { useToast } from '@/ui/Toast/useToast';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { useColumnMappings } from '../api';
import { useCorrectRow } from './api';
import type { ReviewRow } from './api';
import { correctableFields, correctionOf } from './correction';
import type { CorrectableField } from './correction';
import { reasonWord } from './review-text';
import styles from '../imports/imports.module.css';

const NOTHING_CHANGED = 'Change at least one cell to correct this row.';

export interface CorrectDialogProps {
  row: ReviewRow;
  onClose: () => void;
}

/** Correct a row's cells; SP&A One re-checks it at once and says whether it now matches. */
export function CorrectDialog({ row, onClose }: CorrectDialogProps) {
  const mappings = useColumnMappings(row.sourceId);
  const fields = correctableFields(mappings.data?.items ?? []);
  return (
    <CorrectForm
      key={fields.length}
      row={row}
      fields={fields}
      loading={!mappings.data}
      onClose={onClose}
    />
  );
}

interface CorrectFormProps extends CorrectDialogProps {
  fields: CorrectableField[];
  loading: boolean;
}

function CorrectForm({ row, fields, loading, onClose }: CorrectFormProps) {
  const correct = useCorrectRow(row.id);
  const { show } = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<{ cells: string[] }>({
    defaultValues: { cells: fields.map((f) => row.raw[f.column] ?? '') },
    ...CHECK_ON_SAVE,
  });
  const typed = useWatch({ control: form.control, name: 'cells' });

  async function save({ cells }: { cells: string[] }) {
    const edited = Object.fromEntries(fields.map((f, i) => [f.column, cells[i] ?? '']));
    const body = correctionOf(fields, row.raw, edited);
    if (!body) {
      setFailure(NOTHING_CHANGED);
      return;
    }
    setFailure(null);
    try {
      const checked = await correct.mutateAsync(body);
      show({
        message:
          checked.status === 'resolved'
            ? 'Row corrected and matched — its figure now counts'
            : `Row corrected, still to review: ${reasonWord(checked.reason)}`,
      });
      onClose();
    } catch (error) {
      setFailure(`Nothing was changed. ${asApiError(error).message}`);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !correct.isPending && onClose()}
      title="Correct row"
      description="Change the cells that are wrong. The row is checked and matched again as soon as you save."
      submitLabel="Correct and re-check"
      busy={correct.isPending || loading}
      onSubmit={() => void form.handleSubmit(save)()}
    >
      {failure && (
        <p className={styles.failure} role="alert">
          <CircleAlert aria-hidden="true" />
          {failure}
        </p>
      )}
      {loading ? (
        <Skeleton lines={4} />
      ) : (
        <div className={styles.fields}>
          {fields.map((field, index) => (
            <TextField
              key={field.column}
              label={field.column}
              name={`cell-${index}`}
              hint={field.hint}
              value={typed[index] ?? ''}
              onChange={(value) => form.setValue(`cells.${index}`, value)}
            />
          ))}
        </div>
      )}
    </FormDialog>
  );
}
