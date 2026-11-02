import type { LineData, RequestData, VendorData } from './api';
import type { ColumnKey } from './schemas';
import { NOTHING, statusWord } from './words';

interface MoneyLike {
  amount: string;
  currency: string;
}

/** The person's own money and date formats, so a cell's text never depends on a hook. */
export interface Format {
  money: (value: MoneyLike | null | undefined) => string;
  date: (value: string) => string;
}

function when(f: Format, value: string | null): string {
  return value ? f.date(value) : NOTHING;
}

export function vendorText(v: VendorData, column: ColumnKey, f: Format): string {
  switch (column) {
    case 'name':
      return `${v.label} · ${v.purchaseRequests} requests, ${v.lines} lines`;
    case 'amount':
      return f.money(v.committed);
    case 'invoiced':
      return f.money(v.invoiced);
    default:
      return NOTHING;
  }
}

export function requestText(r: RequestData, column: ColumnKey, f: Format): string {
  switch (column) {
    case 'name':
      return r.name;
    case 'id':
      return r.id;
    case 'status':
      return statusWord(r.status);
    case 'amount':
      return f.money(r.amount);
    case 'owner':
      return r.owner.name;
    case 'created':
      return f.date(r.createdOn);
    case 'delivery':
      return when(f, r.deliveryDate);
    case 'sent':
      return when(f, r.sentOn);
    case 'poNumber':
      return r.poNumber ?? NOTHING;
    case 'invoiced':
      return f.money(r.invoiced);
    case 'workflow':
      return r.workflow ?? NOTHING;
    default:
      return NOTHING;
  }
}

export function lineText(l: LineData, column: ColumnKey, f: Format): string {
  switch (column) {
    case 'name':
      return l.activity ? `${l.lineItem.name} · ${l.activity}` : l.lineItem.name;
    case 'id':
      return l.id;
    case 'amount':
      return f.money(l.amount);
    case 'delivery':
      return when(f, l.deliveryDate);
    case 'sent':
      return when(f, l.sentOn);
    case 'poNumber':
      return l.poNumber ?? NOTHING;
    case 'poLine':
      return l.poLine ?? NOTHING;
    case 'poLineStatus':
      return l.poLineStatus ?? NOTHING;
    case 'invoiced':
      return f.money(l.invoiced);
    default:
      return NOTHING;
  }
}

export const NUMERIC: readonly ColumnKey[] = ['amount', 'invoiced'];
