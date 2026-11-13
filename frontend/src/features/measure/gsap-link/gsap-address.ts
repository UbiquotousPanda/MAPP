import { useAddressParams } from '@/ui/useAddressParams';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/ui/Pager/page-sizes';
import type { PageSize } from '@/ui/Pager/page-sizes';

export type GsapTab = 'swbs' | 'waiting' | 'orders';

export { PAGE_SIZES };

/** The columns each tab sorts by: the contract's GsapLinkSort. */
const SORT_KEYS: Record<GsapTab, string[]> = {
  swbs: ['lineItem', 'plan', 'owner', 'companyCode', 'approvedAt', 'waiting'],
  waiting: [
    'purchaseRequest',
    'vendor',
    'owner',
    'plan',
    'routedAt',
    'gsapPrNumber',
    'amount',
    'waiting',
  ],
  orders: [
    'lineItem',
    'plan',
    'purchaseRequest',
    'gsapPrNumber',
    'poNumber',
    'poDate',
    'vendor',
    'poAmount',
    'invoiced',
    'paid',
  ],
};

export interface GsapTable {
  tab: GsapTab;
  sort: string;
  page: number;
  pageSize: PageSize;
}

/** Longest waiting first on the first two tabs; line item, then PO number, on Purchase orders. */
export function defaultSort(tab: GsapTab): string {
  return tab === 'orders' ? 'lineItem' : '-waiting';
}

function validSort(tab: GsapTab, sort: string | null): sort is string {
  return sort !== null && SORT_KEYS[tab].includes(sort.replace(/^-/, ''));
}

function setOrDrop(params: URLSearchParams, name: string, value: string, fallback: string) {
  if (value === fallback) {
    params.delete(name);
  } else {
    params.set(name, value);
  }
}

/** The tab's sort and page in the address; a new sort or page size starts at page 1. */
export function useGsapTable(tab: GsapTab) {
  const [params, setParams] = useAddressParams();
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  const size = Number(params.get('pageSize'));
  const table: GsapTable = {
    tab,
    sort: validSort(tab, sort) ? sort : defaultSort(tab),
    page: Number.isInteger(page) && page > 1 ? page : 1,
    pageSize: PAGE_SIZES.find((s) => s === size) ?? DEFAULT_PAGE_SIZE,
  };
  const change = (patch: Partial<GsapTable>) => {
    const next = { ...table, page: 1, ...patch };
    const written = new URLSearchParams(params);
    setOrDrop(written, 'sort', next.sort, defaultSort(next.tab));
    setOrDrop(written, 'page', String(next.page), '1');
    setOrDrop(written, 'pageSize', String(next.pageSize), String(DEFAULT_PAGE_SIZE));
    setParams(written);
  };
  return { table, change };
}
