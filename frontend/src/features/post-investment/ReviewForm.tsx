import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, isSessionLost } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { allows } from '@/session/gate-action';
import { Button } from '@/ui/Button/Button';
import { FormErrorSummary } from '@/ui/FormErrorSummary/FormErrorSummary';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { LockedNote } from '@/ui/LockedNote/LockedNote';
import { MoneyField } from '@/ui/MoneyField/MoneyField';
import { TextAreaField } from '@/ui/TextAreaField/TextAreaField';
import { TextField } from '@/ui/TextField/TextField';
import { useToast } from '@/ui/Toast/useToast';
import { useSubmitReview, useUpdateReview } from './api';
import type { Review } from './api';
import { changesOf, currencyOf, draftOf, hasChanges, messageFor, problemsOf } from './review-form';
import type { DraftField, ReviewDraft } from './review-form';
import { HINTS, LABELS, SAVED, SUBMITTED } from './review-text';
import styles from './PostInvestment.module.css';

/** A Draft review's form: Enter or Save keeps the fields; Submit saves them, then submits. */
export function ReviewForm({ review }: { review: Review }) {
  const { displayCurrency } = useFormatters();
  // The review this form started from: a save sends its version, so another person's save in between is a
  // version conflict, never silently overwritten by this draft.
  const [base, setBase] = useState<Review>(review);
  const currency = currencyOf(base, displayCurrency);
  const [draft, setDraft] = useState<ReviewDraft>(() => draftOf(review));
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const update = useUpdateReview(review.id);
  const submit = useSubmitReview(review.id);
  const { show } = useToast();
  const busy = update.isPending || submit.isPending;
  const canSubmit = allows(review.access.submit);

  function set(field: DraftField) {
    return (value: string) => setDraft((current) => ({ ...current, [field]: value }));
  }

  /** Saves what changed and answers the saved review, or null when the save was refused. */
  async function save(): Promise<Review | null> {
    const body = changesOf(base, draft, currency);
    if (!hasChanges(body)) {
      return base;
    }
    try {
      const saved = await update.mutateAsync(body);
      setBase(saved);
      return saved;
    } catch (error) {
      refused(error);
      return null;
    }
  }

  function refused(error: unknown) {
    const found = problemsOf(error);
    setProblems(found);
    const failure = error instanceof ApiError ? error : new ApiError('other');
    if (found.length === 0 && !isSessionLost(failure)) {
      show({ message: failure.message });
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (busy) {
      return;
    }
    const saved = await save();
    if (saved) {
      setProblems([]);
      show({ message: SAVED });
    }
  }

  async function onSubmit() {
    if (busy) {
      return;
    }
    const saved = await save();
    if (!saved) {
      return;
    }
    try {
      await submit.mutateAsync(saved.version);
      show({ message: SUBMITTED });
    } catch (error) {
      refused(error);
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void onSave(event)} noValidate>
      <FormErrorSummary errors={problems} />
      <TextField
        label={LABELS.businessCase}
        name="businessCase"
        value={draft.businessCase}
        onChange={set('businessCase')}
        marking="Needed to submit"
        hint={HINTS.businessCase}
        maxLength={200}
        error={messageFor(problems, 'businessCase')}
      />
      <div className={styles.pair}>
        <MoneyField
          label={LABELS.amountSpent}
          name="amountSpent"
          value={draft.amountSpent}
          onChange={set('amountSpent')}
          currency={currency}
          marking="Needed to submit"
          hint={HINTS.amountSpent}
          error={messageFor(problems, 'amountSpent')}
        />
        <MoneyField
          label={LABELS.margin}
          name="margin"
          value={draft.margin}
          onChange={set('margin')}
          currency={currency}
          marking="Needed to submit"
          error={messageFor(problems, 'margin')}
        />
      </div>
      <TextAreaField
        label={LABELS.remarks}
        name="remarks"
        value={draft.remarks}
        onChange={set('remarks')}
        maxLength={2000}
        rows={4}
        error={messageFor(problems, 'remarks')}
      />
      <div className={styles.actions}>
        {canSubmit && (
          <Button type="button" variant="primary" onClick={() => void onSubmit()} disabled={busy}>
            Submit review
          </Button>
        )}
        <Button type="submit" variant="secondary" disabled={busy}>
          Save draft
        </Button>
      </div>
      {!canSubmit && review.access.submit.reason && (
        <LockedNote>{review.access.submit.reason}</LockedNote>
      )}
    </form>
  );
}
