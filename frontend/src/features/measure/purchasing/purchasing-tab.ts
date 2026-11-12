export type PurchasingTab = 'requests' | 'swbs' | 'waiting' | 'orders';

export const PURCHASING_TABS: PurchasingTab[] = ['requests', 'swbs', 'waiting', 'orders'];

export function purchasingTabOf(params: URLSearchParams): { tab: PurchasingTab; unknown: boolean } {
  const raw = params.get('tab');
  const tab = PURCHASING_TABS.find((t) => t === raw);
  return { tab: tab ?? 'requests', unknown: raw !== null && tab === undefined };
}

/** The address on another tab: each tab sorts and pages its own rows, so those start again. */
export function withTab(params: URLSearchParams, tab: string): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set('tab', tab);
  for (const name of ['sort', 'order', 'page']) {
    next.delete(name);
  }
  return next;
}
