import type { components } from '@/api/generated/schema';
import { purchaseRequestHref, recordHref } from './record-links';

type FieldError = components['schemas']['FieldError'];
type ReadinessGroup = components['schemas']['ReadinessGroup'];

/** One thing that stops a purchase request, with where it is fixed. */
export interface ProblemLink {
  key: string;
  text: string;
  href: string;
}

const HEADER_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  ownerId: 'Owner',
  moaApproverId: 'MoA approver',
  approvalWorkflowId: 'Approval workflow',
  modificationWorkflowId: 'Approval workflow for modification',
};
const LINE_LABELS: Record<string, string> = {
  lineItemId: 'Line item',
  currency: 'Currency',
  amount: 'Amount',
  deliveryDate: 'Delivery date',
  overallLimit: 'Overall limit',
  description: 'Description',
};

export function editHref(purchaseRequestId: string, field: string): string {
  const edit = `${purchaseRequestHref(purchaseRequestId)}/edit`;
  return field ? `${edit}?${new URLSearchParams({ field })}` : edit;
}

export function recordTarget(type: string, recordId: string, field: string, prId: string): string {
  if (type === 'activity') {
    return recordHref('activity', recordId);
  }
  return type === 'lineItem' ? recordHref('lineItem', recordId) : editHref(prId, field);
}

/** A field problem in a list: its line and field named unless the message already says which. */
export function problemText(field: string, message: string): string {
  const line = /^lines\[(\d+)\]\.(.+)$/.exec(field);
  const label = line ? LINE_LABELS[line[2] ?? ''] : HEADER_LABELS[field];
  const named = label !== undefined && message.toLowerCase().includes(label.toLowerCase());
  const where = [
    ...(line ? [`Line ${Number(line[1]) + 1}`] : []),
    ...(label && !named ? [label] : []),
  ];
  return where.length > 0 ? `${where.join(' · ')}: ${message}` : message;
}

/** A refused submission's missing fields, grouped by record (409 not_ready, error.missing). */
export function missingLinks(purchaseRequestId: string, groups: ReadinessGroup[]): ProblemLink[] {
  return groups.flatMap((group) =>
    group.fields.map((field) => ({
      key: `${group.record.id}-${field.field}`,
      text: `${group.record.name}: ${field.reason || field.label}`,
      href: recordTarget(group.record.type, group.record.id, field.field, purchaseRequestId),
    })),
  );
}

/** Both kinds of problem of a refusal together (032 D-404): the field problems, then the gates by record. */
export function refusalLinks(
  purchaseRequestId: string,
  refusal: { fields: FieldError[]; missing: ReadinessGroup[] },
): ProblemLink[] {
  const fields = refusal.fields.map((problem, index) => ({
    key: `field-${index}-${problem.field}`,
    text: problemText(problem.field, problem.message),
    href: editHref(purchaseRequestId, problem.field),
  }));
  return [...fields, ...missingLinks(purchaseRequestId, refusal.missing)];
}
