import { ApiError, isSessionLost } from '@/api/errors';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/ui/Toast/useToast';
import { useUndoableDelete } from '@/ui/useUndoableDelete';
import { reviewKeys, useDeleteReview } from './api';
import type { Review } from './api';

interface DeleteReviewDialogProps {
  review: Review;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteReviewDialog({ review, onClose, onDeleted }: DeleteReviewDialogProps) {
  const remove = useDeleteReview();
  const { show } = useToast();
  const afterDelete = useUndoableDelete({ invalidate: [reviewKeys.all] });

  async function confirm() {
    if (remove.isPending) {
      return;
    }
    try {
      afterDelete(await remove.mutateAsync(review.id));
      onClose();
      onDeleted();
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('other');
      if (!isSessionLost(failure)) {
        show({ message: failure.message });
      }
      onClose();
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={`Delete the post-investment review of '${review.activity.name}'?`}
      confirmLabel="Delete review"
      tone="danger"
      busy={remove.isPending}
      onConfirm={() => void confirm()}
    >
      It moves to the recycle bin; you can restore it.
    </ConfirmDialog>
  );
}
