import { ApiError } from '@/api/errors';
import { parseMoneyInput } from '@/format/decimal';
import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import type { Money, Review, ReviewUpdate } from './api';

export interface ReviewDraft {
  businessCase: string;
  amountSpent: string;
  margin: string;
  remarks: string;
}

export type DraftField = keyof ReviewDraft;

export const DRAFT_FIELDS: DraftField[] = ['businessCase', 'amountSpent', 'margin', 'remarks'];

export function draftOf(review: Review): ReviewDraft {
  return {
    businessCase: review.businessCase,
    amountSpent: review.amountSpent?.amount ?? '',
    margin: review.margin?.amount ?? '',
    remarks: review.remarks,
  };
}

/** Amount spent and margin share one currency: the review's, else the person's display currency. */
export function currencyOf(review: Review, displayCurrency: string): string {
  return review.amountSpent?.currency ?? review.margin?.currency ?? displayCurrency;
}

function moneyInput(typed: string, currency: string): Money | null {
  const text = typed.trim();
  if (text === '') {
    return null;
  }
  // Unreadable text goes as typed, so the server's message for the field shows.
  return { amount: parseMoneyInput(text)?.amount ?? text, currency };
}

/** The PATCH body: the version and only the fields that differ from the saved review. */
export function changesOf(review: Review, draft: ReviewDraft, currency: string): ReviewUpdate {
  const saved = draftOf(review);
  const body: ReviewUpdate = { version: review.version };
  if (draft.businessCase !== saved.businessCase) {
    body.businessCase = draft.businessCase;
  }
  if (draft.remarks !== saved.remarks) {
    body.remarks = draft.remarks;
  }
  if (draft.amountSpent !== saved.amountSpent) {
    body.amountSpent = moneyInput(draft.amountSpent, currency);
  }
  if (draft.margin !== saved.margin) {
    body.margin = moneyInput(draft.margin, currency);
  }
  return body;
}

export function hasChanges(body: ReviewUpdate): boolean {
  return Object.keys(body).length > 1;
}

/** Every field problem the API answered, by form field ("amountSpent.amount" is Amount spent). */
export function problemsOf(error: unknown): FieldProblem[] {
  if (!(error instanceof ApiError) || error.kind !== 'validation') {
    return [];
  }
  return error.fields.map((problem) => ({
    field: problem.field.split('.')[0] ?? problem.field,
    message: problem.message,
  }));
}

export function messageFor(problems: FieldProblem[], field: DraftField): string | undefined {
  return problems.find((problem) => problem.field === field)?.message;
}
