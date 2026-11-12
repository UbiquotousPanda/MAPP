import { useSearchParams } from 'react-router';
import { WIDGET_PAGE_SIZES } from '@/ui/Pager/page-sizes';

export interface RankedState {
  sort: string;
  order: 'desc' | 'asc';
  group: string;
  size: (typeof WIDGET_PAGE_SIZES)[number];
  page: number;
  q: string;
  drill: string;
}

const DEFAULTS = new Map<string, unknown>([
  ['group', 'none'],
  ['size', 10],
  ['page', 1],
  ['q', ''],
  ['drill', ''],
]);

function sizeOf(text: string | null): RankedState['size'] {
  return WIDGET_PAGE_SIZES.find((size) => String(size) === text) ?? 10;
}

/** The ranked list's part of the address; any change but the page goes back to page 1. */
export function useRankedState(defaultSort: string, defaultOrder: RankedState['order'] = 'desc') {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page'));
  const order = params.get('order');
  const state: RankedState = {
    sort: params.get('sort') ?? defaultSort,
    order: order === 'asc' || order === 'desc' ? order : defaultOrder,
    group: params.get('group') ?? 'none',
    size: sizeOf(params.get('size')),
    page: Number.isInteger(page) && page > 1 ? page : 1,
    q: params.get('q') ?? '',
    drill: params.get('drill') ?? '',
  };
  const defaults = new Map([...DEFAULTS, ['sort', defaultSort], ['order', defaultOrder]]);
  const change = (patch: Partial<RankedState>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries({ ...patch, page: patch.page ?? 1 })) {
      const unset = value === defaults.get(name);
      if (unset) {
        next.delete(name);
      } else {
        next.set(name, String(value));
      }
    }
    setParams(next);
  };
  return { state, change };
}
