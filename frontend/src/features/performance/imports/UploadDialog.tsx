import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { asApiError } from '@/api/errors';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { FieldShell } from '@/ui/FieldShell/FieldShell';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import type { PerformanceSource } from '../api';
import { useUploadFile } from './api';
import type { PerformanceImport } from './api';
import { NEED_CSV, NO_UPLOAD_SOURCE, UNREADABLE } from './imports-text';
import styles from './imports.module.css';

const uploadSchema = z.object({
  sourceId: z.string().min(1, 'Choose the data source this file comes from.'),
  file: z
    .instanceof(File)
    .nullable()
    .refine((file) => file !== null && /\.csv$/i.test(file.name), NEED_CSV),
});

type UploadValues = z.infer<typeof uploadSchema>;

export interface UploadDialogProps {
  sources: PerformanceSource[];
  onClose: () => void;
  onLoaded: (load: PerformanceImport) => void;
}

/** Upload a file: a UTF-8 CSV for one data source, refused whole when the API says so. */
export function UploadDialog({ sources, onClose, onLoaded }: UploadDialogProps) {
  const upload = useUploadFile();
  const offered = sources.filter((s) => s.status === 'active' && s.deliveryRoute === 'upload');
  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { sourceId: offered.length === 1 ? (offered[0]?.id ?? '') : '', file: null },
    ...CHECK_ON_SAVE,
  });
  const sourceId = useWatch({ control: form.control, name: 'sourceId' });
  const file = useWatch({ control: form.control, name: 'file' });
  const { errors } = form.formState;
  const [failure, setFailure] = useState<string | null>(null);

  async function send({ sourceId: chosen, file: picked }: UploadValues) {
    if (!picked) {
      return;
    }
    setFailure(null);
    let content: string;
    try {
      content = await base64Of(picked);
    } catch {
      form.setError('file', { message: UNREADABLE });
      return;
    }
    try {
      onLoaded(
        await upload.mutateAsync({ sourceId: chosen, body: { fileName: picked.name, content } }),
      );
    } catch (error) {
      showRefusal(error);
    }
  }

  function showRefusal(error: unknown) {
    const refused = asApiError(error);
    const atFile = refused.fields.find((f) => f.field === 'content' || f.field === 'fileName');
    if (atFile) {
      form.setError('file', { message: atFile.message });
    } else if (refused.kind === 'notAllowed' || refused.kind === 'tooLarge') {
      form.setError('file', { message: refused.message });
    } else {
      setFailure(`Nothing was loaded. ${refused.message}`);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !upload.isPending && onClose()}
      title="Upload a file"
      description="SP&A One checks every row, matches it to an activity and tells you what became of each one."
      submitLabel="Upload"
      busy={upload.isPending}
      onSubmit={() => void form.handleSubmit(send)()}
    >
      {failure && (
        <InlineAlert tone="danger" role="alert">
          {failure}
        </InlineAlert>
      )}
      <div className={styles.fields}>
        <ChoiceField
          name="sourceId"
          label="Data source"
          marking="Required"
          options={offered.map((s) => ({ id: s.id, label: s.name, active: true }))}
          value={sourceId}
          onChange={(value) => form.setValue('sourceId', value)}
          disabledReason={offered.length === 0 ? NO_UPLOAD_SOURCE : undefined}
          error={errors.sourceId?.message}
        />
        <FieldShell
          id="performance-file"
          label="File"
          marking="Required"
          hint="A UTF-8 .csv file with a header row, laid out as the source's template. At most 2 MB."
          error={errors.file?.message}
        >
          {(describedBy, required) => (
            <input
              id="performance-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              className={styles.file}
              aria-required={required}
              aria-invalid={errors.file ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => form.setValue('file', event.target.files?.[0] ?? null)}
            />
          )}
        </FieldShell>
        {upload.isPending && file && (
          <p className={styles.progress} role="status">
            <LoaderCircle aria-hidden="true" className={styles.spinner} />
            {`Uploading ${file.name}…`}
          </p>
        )}
      </div>
    </FormDialog>
  );
}

function base64Of(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'));
    reader.readAsDataURL(file);
  });
}
