import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { asApiError } from '@/api/errors';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { useToast } from '@/ui/Toast/useToast';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { useDismissRow } from './api';
import type { ReviewRow } from './api';
import { COMMENT_NEEDED } from './review-text';

const dismissSchema = z.object({ comment: z.string().trim().min(1, COMMENT_NEEDED) });

export interface DismissDialogProps {
  row: ReviewRow;
  onClose: () => void;
}

/** Set a row aside: the comment is required, and the row can be reopened later. */
export function DismissDialog({ row, onClose }: DismissDialogProps) {
  const dismiss = useDismissRow(row.id);
  const { show } = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(dismissSchema),
    defaultValues: { comment: '' },
    ...CHECK_ON_SAVE,
  });
  const comment = useWatch({ control: form.control, name: 'comment' });

  async function send(values: { comment: string }) {
    setFailure(null);
    try {
      await dismiss.mutateAsync(values.comment.trim());
      show({ message: 'Row dismissed — it counts nowhere until reopened' });
      onClose();
    } catch (error) {
      const refused = asApiError(error);
      const atComment = refused.fields.find((f) => f.field === 'comment');
      if (atComment) {
        form.setError('comment', { message: atComment.message });
      } else {
        setFailure(`Nothing was changed. ${refused.message}`);
      }
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !dismiss.isPending && onClose()}
      title="Dismiss row"
      description="A dismissed row counts nowhere. It stays listed as Dismissed and can be reopened."
      submitLabel="Dismiss row"
      busy={dismiss.isPending}
      onSubmit={() => void form.handleSubmit(send)()}
    >
      {failure && (
        <InlineAlert tone="danger" role="alert">
          {failure}
        </InlineAlert>
      )}
      <TextAreaField
        name="comment"
        label="Why is this row being dismissed?"
        marking="Required"
        maxLength={500}
        value={comment}
        onChange={(value) => form.setValue('comment', value)}
        error={form.formState.errors.comment?.message}
      />
    </FormDialog>
  );
}
