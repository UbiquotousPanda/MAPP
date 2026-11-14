// Every change refreshes the currencies, the activity log, the recycle bin and the Settings counts.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { SETTINGS_KEYS } from '../api';

export type Currency = components['schemas']['Currency'];
export type CurrencyCreate = components['schemas']['CurrencyCreate'];
export type CurrencyUpdate = components['schemas']['CurrencyUpdate'];
export type ChangeImpact = components['schemas']['ChangeImpact'];

export const CURRENCY_LISTS: QueryKey[] = [
  SETTINGS_KEYS.currencies,
  SETTINGS_KEYS.overview,
  ['activity-log'],
  ['recycle-bin'],
];

export function fetchCurrency(code: string): Promise<Currency> {
  return call(api.GET('/api/v1/currencies/{code}', { params: { path: { code } } }));
}

export function checkCurrencyImpact(code: string, body: CurrencyUpdate): Promise<ChangeImpact> {
  return call(api.POST('/api/v1/currencies/{code}/impact', { params: { path: { code } }, body }));
}

export function setCurrencyStatus(code: string, body: { active: boolean; version: number }) {
  return call(api.POST('/api/v1/currencies/{code}/status', { params: { path: { code } }, body }));
}

export function useCreateCurrency() {
  const refresh = useRefreshCurrencyLists();
  return useMutation({
    mutationFn: (body: CurrencyCreate) => call(api.POST('/api/v1/currencies', { body })),
    onSettled: refresh,
  });
}

export function useUpdateCurrency() {
  const refresh = useRefreshCurrencyLists();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: CurrencyUpdate }) =>
      call(api.PATCH('/api/v1/currencies/{code}', { params: { path: { code } }, body })),
    onSettled: refresh,
  });
}

export function useDeleteCurrency() {
  const refresh = useRefreshCurrencyLists();
  return useMutation({
    mutationFn: ({ id: code, version }: Seen) =>
      call(
        api.DELETE('/api/v1/currencies/{code}', { params: { path: { code }, query: { version } } }),
      ),
    onSettled: refresh,
  });
}

function useRefreshCurrencyLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(CURRENCY_LISTS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
