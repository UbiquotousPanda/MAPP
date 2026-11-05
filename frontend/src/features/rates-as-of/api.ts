import { useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';

const CURRENT = ['exchange-rates', 'current'] as const;
const getCurrent = () => call(api.GET('/api/v1/exchange-rates/current'));

/** The current rates with their "as of" time, under the same key as every other reader of them. */
export function useRatesAsOf() {
  return useQuery({
    queryKey: CURRENT,
    queryFn: getCurrent,
    staleTime: 5 * 60_000,
    select: (page) => page.asOf,
  });
}

const perUsd = (page: {
  items: { currency: string; rate: string }[];
}): ReadonlyMap<string, string> => new Map(page.items.map((item) => [item.currency, item.rate]));

/** The same current rates as units of each currency per 1 USD. */
export function useCurrentRatesPerUsd(enabled = true) {
  return useQuery({
    queryKey: CURRENT,
    queryFn: getCurrent,
    staleTime: 5 * 60_000,
    select: perUsd,
    enabled,
  });
}
