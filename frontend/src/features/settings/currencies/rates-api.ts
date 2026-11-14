// Every rate change refreshes everything under ['exchange-rates'] and the currencies list, whose rates follow.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import type { Seen } from '@/api/seen';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { downloadFromApi } from '@/api/download';
import { CURRENCY_LISTS } from './api';

export type ExchangeRateRecord = components['schemas']['ExchangeRateRecord'];
export type ExchangeRatePage = components['schemas']['ExchangeRatePage'];
export type ExchangeRateCreate = components['schemas']['ExchangeRateCreate'];
export type ExchangeRateUpdate = components['schemas']['ExchangeRateUpdate'];
export type RateUsed = components['schemas']['RateUsed'];
export type RateSource = components['schemas']['RateSource'];
export type RateImport = components['schemas']['RateImport'];
export type RateImportCheck = components['schemas']['RateImportCheck'];
export type RateImportRow = components['schemas']['RateImportRow'];
export type RateImportOutcome = components['schemas']['RateImportOutcome'];
export type RateImportCounts = components['schemas']['RateImportCounts'];
export type RateImportUpload = components['schemas']['RateImportUpload'];
export type ChangeImpact = components['schemas']['ChangeImpact'];

export const RATE_KEYS = {
  all: ['exchange-rates'] as const,
  history: (code: string) => ['exchange-rates', 'history', code] as const,
  imports: ['exchange-rates', 'imports'] as const,
  current: ['exchange-rates', 'current'] as const,
};

export const RECENT_IMPORTS = 10;

export const RATE_LISTS: QueryKey[] = [RATE_KEYS.all, ...CURRENCY_LISTS];

export function useRateHistory(code: string) {
  return useQuery({
    queryKey: RATE_KEYS.history(code),
    queryFn: ({ signal }) =>
      call(api.GET('/api/v1/currencies/{code}/rates', { params: { path: { code } }, signal })),
  });
}

export function useRateImports() {
  return useQuery({
    queryKey: RATE_KEYS.imports,
    queryFn: ({ signal }) =>
      call(
        api.GET('/api/v1/exchange-rates/imports', {
          params: { query: { limit: RECENT_IMPORTS } },
          signal,
        }),
      ),
  });
}

export function checkAddRateImpact(code: string, body: ExchangeRateCreate): Promise<ChangeImpact> {
  return call(
    api.POST('/api/v1/currencies/{code}/rates/impact', { params: { path: { code } }, body }),
  );
}

export function checkUpdateRateImpact(
  rateId: string,
  body: ExchangeRateUpdate,
): Promise<ChangeImpact> {
  return call(
    api.POST('/api/v1/exchange-rates/{rateId}/impact', { params: { path: { rateId } }, body }),
  );
}

export async function fetchRate(code: string, rateId: string) {
  const page = await call(
    api.GET('/api/v1/currencies/{code}/rates', { params: { path: { code } } }),
  );
  return page.items.find((rate) => rate.id === rateId);
}

export function useAddRate() {
  const refresh = useRefreshRateLists();
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: ExchangeRateCreate }) =>
      call(api.POST('/api/v1/currencies/{code}/rates', { params: { path: { code } }, body })),
    onSettled: refresh,
  });
}

export function useUpdateRate() {
  const refresh = useRefreshRateLists();
  return useMutation({
    mutationFn: ({ rateId, body }: { rateId: string; body: ExchangeRateUpdate }) =>
      call(api.PATCH('/api/v1/exchange-rates/{rateId}', { params: { path: { rateId } }, body })),
    onSettled: refresh,
  });
}

export function useDeleteRate() {
  const refresh = useRefreshRateLists();
  return useMutation({
    mutationFn: ({ id: rateId, version }: Seen) =>
      call(
        api.DELETE('/api/v1/exchange-rates/{rateId}', {
          params: { path: { rateId }, query: { version } },
        }),
      ),
    onSettled: refresh,
  });
}

export function checkRateImport(body: RateImportUpload): Promise<RateImportCheck> {
  return call(api.POST('/api/v1/exchange-rates/import-check', { body }));
}

export function useImportRates() {
  const refresh = useRefreshRateLists();
  return useMutation({
    mutationFn: (body: RateImportUpload) =>
      call(api.POST('/api/v1/exchange-rates/import', { body })),
    onSettled: refresh,
  });
}

export function downloadRateSample(): Promise<string> {
  return downloadFromApi(
    api.GET('/api/v1/exchange-rates/import-sample', { parseAs: 'blob' }),
    'gsap_rates_sample.csv',
  );
}

function useRefreshRateLists() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(RATE_LISTS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
