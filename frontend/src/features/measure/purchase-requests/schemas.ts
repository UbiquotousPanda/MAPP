import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/ui/Pager/page-sizes';
import type { PageSize } from '@/ui/Pager/page-sizes';

export const STATUSES = [
  'created',
  'submitted',
  'inReview',
  'declined',
  'approved',
  'closed',
] as const;

export const SORT_KEYS = ['name', 'status', 'amount', 'invoiced', 'created', 'delivery'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const COLUMN_KEYS = [
  'name',
  'id',
  'status',
  'amount',
  'owner',
  'created',
  'delivery',
  'sent',
  'poNumber',
  'poLine',
  'poLineStatus',
  'invoiced',
  'workflow',
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export { PAGE_SIZES };
export type { PageSize };

export interface RequestsParams {
  vendors: string[];
  requestOwners: string[];
  statuses: string[];
  q: string;
  sort: SortKey;
  order: 'asc' | 'desc';
  page: number;
  pageSize: PageSize;
  columns: ColumnKey[];
}

export const DEFAULT_PARAMS: RequestsParams = {
  vendors: [],
  requestOwners: [],
  statuses: [],
  q: '',
  sort: 'name',
  order: 'asc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  columns: [...COLUMN_KEYS],
};

const vendorSchema = z.string().trim().min(1).max(100);
const wordSchema = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);

function list(params: URLSearchParams, name: string, schema: z.ZodType<string>): string[] {
  const kept: string[] = [];
  for (const raw of params.getAll(name)) {
    const parsed = schema.safeParse(raw);
    if (parsed.success && !kept.includes(parsed.data)) {
      kept.push(parsed.data);
    }
  }
  return kept;
}

function pick<T>(params: URLSearchParams, name: string, schema: z.ZodType<T>, fallback: T): T {
  const parsed = schema.safeParse(params.get(name) ?? undefined);
  return parsed.success ? parsed.data : fallback;
}

/** The chosen columns in order; anything unknown, repeated or empty restores the default. */
function columnsOf(raw: string | null): ColumnKey[] {
  if (!raw) {
    return [...COLUMN_KEYS];
  }
  const chosen: ColumnKey[] = [];
  for (const part of raw.split(',')) {
    const key = COLUMN_KEYS.find((k) => k === part);
    if (!key || chosen.includes(key)) {
      return [...COLUMN_KEYS];
    }
    chosen.push(key);
  }
  return chosen;
}

export function readRequestsParams(params: URLSearchParams): RequestsParams {
  return {
    vendors: list(params, 'vendor', vendorSchema),
    requestOwners: list(params, 'requestOwner', wordSchema),
    statuses: list(params, 'status', wordSchema),
    q: pick(params, 'q', z.string().trim().min(1).max(100), ''),
    sort: pick(params, 'sort', z.enum(SORT_KEYS), DEFAULT_PARAMS.sort),
    order: pick(params, 'order', z.enum(['asc', 'desc']), DEFAULT_PARAMS.order),
    page: pick(params, 'page', z.coerce.number().int().min(1), 1),
    pageSize:
      PAGE_SIZES.find((n) => n === Number(params.get('pageSize'))) ?? DEFAULT_PARAMS.pageSize,
    columns: columnsOf(params.get('columns')),
  };
}

const OWN_NAMES = [
  'vendor',
  'requestOwner',
  'status',
  'q',
  'sort',
  'order',
  'page',
  'pageSize',
  'columns',
];

/** The address with the report's own parameters set; a default is left out, so the address stays short. */
export function writeRequestsParams(
  params: URLSearchParams,
  next: RequestsParams,
): URLSearchParams {
  const written = new URLSearchParams(params);
  for (const name of OWN_NAMES) {
    written.delete(name);
  }
  const set = (name: string, value: string, fallback: string) => {
    if (value !== fallback) {
      written.set(name, value);
    }
  };
  set('q', next.q, '');
  set('sort', next.sort, DEFAULT_PARAMS.sort);
  set('order', next.order, DEFAULT_PARAMS.order);
  set('page', String(next.page), '1');
  set('pageSize', String(next.pageSize), String(DEFAULT_PARAMS.pageSize));
  set('columns', next.columns.join(','), COLUMN_KEYS.join(','));
  next.vendors.forEach((value) => written.append('vendor', value));
  next.requestOwners.forEach((value) => written.append('requestOwner', value));
  next.statuses.forEach((value) => written.append('status', value));
  return written;
}
