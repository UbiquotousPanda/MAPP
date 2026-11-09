import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import type { ReportAddress } from '../../shared';

export type ActivityDeals = components['schemas']['ActivityDeals'];
export type Deal = components['schemas']['Deal'];
export type DealStep = components['schemas']['DealStep'];
export type DealActivity = components['schemas']['DealActivity'];
export type AttributionModel = components['schemas']['AttributionModel'];
export type AttributionModelChoice = components['schemas']['AttributionModelChoice'];

export interface DealsParams {
  activityId: string;
  year: number | null;
  currency: string | null;
  compare: AttributionModel | null;
  page: number;
}

export const DEALS_KEY = ['reports', 'revenue', 'deals'] as const;

/** The deals behind one activity's attributed revenue (058), for the frame's year and display currency. */
export function useActivityDeals(params: DealsParams | null) {
  return useQuery({
    queryKey: [...DEALS_KEY, params],
    enabled: params !== null,
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/revenue/activities/{activityId}/deals', {
          params: {
            path: { activityId: params?.activityId ?? '' },
            query: {
              ...(params?.year && { year: params.year }),
              ...(params?.currency && { currency: params.currency }),
              ...(params?.compare && { compare: params.compare }),
              page: params?.page ?? 1,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function dealsParams(
  address: ReportAddress,
  activityId: string,
  compare: AttributionModel | null,
  page: number,
): DealsParams {
  return { activityId, year: address.year, currency: address.currency, compare, page };
}
