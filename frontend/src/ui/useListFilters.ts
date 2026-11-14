import { z } from 'zod';
import { useAddressParams } from './useAddressParams';

const statusSchema = z.enum(['active', 'inactive', 'all']).catch('active');

export type StatusFilter = z.infer<typeof statusSchema>;

export function statusFilterOf(raw: string | null): StatusFilter {
  return statusSchema.parse(raw);
}

export interface ListFilters {
  q: string;
  status: StatusFilter;
  setQ: (q: string) => void;
  setStatus: (status: StatusFilter) => void;
  /** "Clear filters": no search, every status. */
  clear: () => void;
  openId: string;
  setOpenId: (id: string) => void;
}

/** A Settings list's search, status and open record (`q`, `status`, `id`) in the address. */
export function useListFilters(): ListFilters {
  const [params, setParams] = useAddressParams();
  const status = statusFilterOf(params.get('status'));

  function update(changes: Record<string, string | null>, replace = true) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      },
      { replace },
    );
  }

  return {
    q: params.get('q') ?? '',
    status,
    setQ: (q) => update({ q }),
    setStatus: (next) => update({ status: next === 'active' ? null : next }),
    clear: () => update({ q: null, status: 'all' }),
    openId: params.get('id') ?? '',
    // Opening details is a step people can go Back from; closing them replaces it.
    setOpenId: (id) => update({ id }, id === ''),
  };
}

export interface FilteredRecords<T> {
  shown: T[];
  counts: Record<StatusFilter, number>;
}

/** The counts are those of the search alone, so each status choice says what it would show. */
export function filterRecords<T extends { active: boolean }>(
  records: T[],
  { q, status }: Pick<ListFilters, 'q' | 'status'>,
  searchText: (record: T) => string,
): FilteredRecords<T> {
  const query = q.trim().toLowerCase();
  const found = query
    ? records.filter((record) => searchText(record).toLowerCase().includes(query))
    : records;
  const active = found.filter((record) => record.active);
  const inactive = found.filter((record) => !record.active);
  return {
    shown: status === 'active' ? active : status === 'inactive' ? inactive : found,
    counts: { active: active.length, inactive: inactive.length, all: found.length },
  };
}
