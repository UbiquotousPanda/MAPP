import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { FormField } from '@/ui/FormField/FormField';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { useFormatters } from '@/format/useFormatters';
import type { ApprovalSubmission } from './api';
import { names } from './messages';
import { approvedAutomaticallyText, submitConfirmLabel, submitDialogTitle } from './submit-texts';
import { commentSchema } from './schemas';
import { SubmissionOutcomes } from './SubmissionOutcomes';
import styles from './approval-dialogs.module.css';

const COMMENT_MAX = 2000;

export interface SubmitDialogProps {
  submission: ApprovalSubmission;
  busy: boolean;
  commentError?: string;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export function SubmitDialog({
  submission,
  busy,
  commentError,
  onConfirm,
  onCancel,
}: SubmitDialogProps) {
  const { money } = useFormatters();
  const form = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' },
    ...CHECK_ON_SAVE,
  });
  const resubmit = submission.kind === 'resubmit';
  const sent = submission.lineItems ?? [];
  const outcomes = submission.outcomes ?? [];

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      title={submitDialogTitle(submission)}
      confirmLabel={submitConfirmLabel(submission.kind)}
      busy={busy}
      onConfirm={() => void form.handleSubmit(({ comment }) => onConfirm(comment.trim()))()}
    >
      <div className={styles.body}>
        {sent.length > 0 && <SentLineItems items={sent} />}
        {submission.workflow && <p>{`Approval workflow: ${submission.workflow.name}`}</p>}
        {outcomes.length > 0 ? (
          <SubmissionOutcomes outcomes={outcomes} />
        ) : (
          submission.levels.length > 0 && (
            <ol role="list" className={styles.levels}>
              {submission.levels.map((level) => (
                <li key={level.number}>{`${level.label} · ${names(level.approvers)}`}</li>
              ))}
            </ol>
          )
        )}
        {submission.approvedAutomatically && (
          <p className={styles.strong}>{approvedAutomaticallyText(submission.kind)}</p>
        )}
        {submission.replaces ? (
          <p className={styles.strong}>{replacesText(submission)}</p>
        ) : (
          resubmit &&
          !submission.approvedAutomatically && (
            <p>{`Round ${submission.roundNumber} starts at level 1.`}</p>
          )
        )}
        {submission.unassignedPlannedCost && (
          <p className={styles.note}>
            {`${money(submission.unassignedPlannedCost)} of the planned cost is not yet assigned to a line item.`}
          </p>
        )}
        <FormField
          control={form.control}
          name="comment"
          render={(field) => (
            <TextAreaField
              label="Comment for the approvers (optional)"
              rows={3}
              maxLength={COMMENT_MAX}
              {...field}
              error={commentError}
            />
          )}
        />
      </div>
    </ConfirmDialog>
  );
}

/** What re-submitting a Submitted record ends, said before anything changes. */
function replacesText(submission: ApprovalSubmission): string {
  const replaced = submission.replaces;
  if (!replaced) {
    return '';
  }
  return `Round ${replaced.roundNumber}, waiting at ${replaced.levelLabel}, ends and round ${submission.roundNumber} starts at the first level that needs a decision.`;
}

/** The line items a send names before anything changes (053 FR-008). */
function SentLineItems({ items }: { items: NonNullable<ApprovalSubmission['lineItems']> }) {
  return (
    <>
      <p>The activity stays Approved. These line items go to the approvers:</p>
      <ul role="list" className={styles.levels}>
        {items.map((item) => (
          <li key={item.id}>{`${item.id} · ${item.name}`}</li>
        ))}
      </ul>
    </>
  );
}
