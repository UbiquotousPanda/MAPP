import type { ActivityApproval } from './api';

export type RoundLineItem = NonNullable<ActivityApproval['lineItems']>[number];

export const HELD_BACK = 'Not approved at an earlier level of this round.';
export const UNTICKED_STAY =
  "Unticked line items stay Not approved: no SWBS code is requested for them and they can't be on a purchase request.";

/** The line items ticked at first: every one an earlier decision did not hold back. */
export function initiallyTicked(items: RoundLineItem[]): Set<string> {
  return new Set(items.filter((item) => !item.heldBack).map((item) => item.id));
}

/** A copy of ticked with id ticked or unticked. */
export function withTick(ticked: ReadonlySet<string>, id: string, checked: boolean): Set<string> {
  const next = new Set(ticked);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

const APPROVED_LINE_ITEMS = 'approvedLineItemIds';

/** A refused selection says which line item is no longer waiting; anything else keeps its own message. */
export function decisionFailureMessage(failure: {
  message: string;
  fields: { field: string; message: string }[];
}): string {
  return (
    failure.fields.find((field) => field.field === APPROVED_LINE_ITEMS)?.message ?? failure.message
  );
}

export function decisionTitle(approve: boolean, name: string, forLineItems: boolean): string {
  const verb = approve ? 'Approve' : 'Decline';
  return forLineItems ? `${verb} line items of '${name}'?` : `${verb} '${name}'?`;
}

export function decisionConfirmLabel(approve: boolean, forLineItems: boolean): string {
  if (approve) {
    return 'Approve';
  }
  return forLineItems ? 'Decline line items' : 'Decline activity';
}

export function lastLevelText(forLineItems: boolean): string {
  return forLineItems
    ? 'This is the last level — the ticked line items become Approved.'
    : 'This is the last level — the activity becomes Approved.';
}

export const LINE_ITEMS_DECLINED =
  'The activity stays Approved. Its line items stay Not approved, and its owner can send them again.';
