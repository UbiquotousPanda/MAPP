import type { SortDirection } from './SortHeader';

/** A click on the sorted column turns its order round; another column starts ascending. */
export function nextSortOrder(sorted: boolean, order: SortDirection): SortDirection {
  return sorted && order === 'asc' ? 'desc' : 'asc';
}
