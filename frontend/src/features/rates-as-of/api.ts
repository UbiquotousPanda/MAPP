import { useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';

/** The current rates with their "as of" time, under the same key as every other reader of them. */
export function useRatesAsOf() {
  return useQuery({
    queryKey: ['exchange-rates', 'current'],
    queryFn: () => call(api.GET('/api/v1/exchange-rates/current')),
    staleTime: 5 * 60_000,
    select: (page) => page.asOf,
  });
}
