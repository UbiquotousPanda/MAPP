interface Move {
  to: string;
  selector?: 'stage' | 'tab';
  value?: string;
  keepOwn?: boolean;
  drop?: string[];
}

const SUMMARY_ONLY = ['stage', 'revenueBy', 'performanceBy', 'costBy', 'roiBy'];

// Where each old report's address now lives; keepOwn keeps a stage or tab the old address already carried.
const MOVES: Record<string, Move> = {
  summary: { to: 'performance', drop: SUMMARY_ONLY },
  revenue: { to: 'performance', selector: 'stage', value: 'revenue' },
  funnel: { to: 'performance', selector: 'stage', value: 'inq', keepOwn: true },
  'plan-budget': { to: 'budget' },
  'purchase-requests': { to: 'purchasing', selector: 'tab', value: 'requests' },
  'gsap-link': { to: 'purchasing', selector: 'tab', value: 'swbs', keepOwn: true },
  'plan-details': { to: 'plan-data', selector: 'tab', value: 'completeness' },
  'user-access': { to: 'plan-data', selector: 'tab', value: 'people' },
};

/** The new address of an old report's address, with its stage or tab and every filter it carried. */
export function redirectOf(oldPath: string, search: string): string {
  const move = MOVES[oldPath.replace(/^\/reports\//, '')];
  if (!move) return `/reports${search}`;
  const params = new URLSearchParams(search);
  for (const name of move.drop ?? []) params.delete(name);
  if (move.selector) {
    const own = move.keepOwn ? params.get(move.selector) : null;
    params.delete(move.selector);
    params.set(move.selector, own ?? move.value ?? '');
  }
  const query = params.toString();
  return `/reports/${move.to}${query ? `?${query}` : ''}`;
}
