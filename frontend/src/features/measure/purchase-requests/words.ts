import type { ColumnKey } from './schemas';

export const NOTHING = '—';

export const STATUS_WORDS: Record<string, string> = {
  created: 'Created',
  submitted: 'Submitted',
  inReview: 'In review',
  declined: 'Declined',
  approved: 'Approved',
  closed: 'Closed',
};

export const COLUMN_WORDS: Record<ColumnKey, string> = {
  name: 'Name',
  id: 'ID',
  status: 'Status',
  amount: 'Amount',
  owner: 'Owner',
  created: 'Created on',
  delivery: 'Delivery date',
  sent: 'Sent on',
  poNumber: 'Purchase order',
  poLine: 'PO line',
  poLineStatus: 'PO line status',
  invoiced: 'Invoiced',
  workflow: 'Approval workflow',
};

export const SORTABLE: readonly string[] = [
  'name',
  'status',
  'amount',
  'invoiced',
  'created',
  'delivery',
];

export function statusWord(status: string): string {
  return STATUS_WORDS[status] ?? status;
}

export const COMMITTED = 'Committed by approved purchase requests';

export const COMMITTED_TIP =
  'The amount of the Approved and Closed purchase request lines. It counts only purchase requests, so it ' +
  'can differ from Committed on Plan budget, Home and Financials.';
