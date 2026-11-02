import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { toQuery, writeAddress } from '../shared';
import type { ReportAddress } from '../shared';
import { COLUMN_KEYS } from './schemas';
import type { RequestsParams } from './schemas';

export type RequestsReportData = components['schemas']['PurchaseRequestsReport'];
export type StatusMixData = RequestsReportData['statusMix'];
export type CardsData = RequestsReportData['cards'];
export type ChartData = RequestsReportData['byVendor'];
export type RequestsGridData = RequestsReportData['grid'];
export type VendorData = RequestsGridData['vendors'][number];
export type RequestData = VendorData['requests'][number];
export type LineData = RequestData['lines'][number];

export function useRequestsReport(address: ReportAddress, params: RequestsParams) {
  return useQuery({
    queryKey: ['reports', 'purchaseRequests', writeAddress(address).toString(), params],
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/purchase-requests', {
          params: {
            query: {
              ...toQuery(address),
              vendor: params.vendors,
              requestOwner: params.requestOwners,
              status: params.statuses,
              ...(params.q && { q: params.q }),
              sort: params.sort,
              order: params.order,
              page: params.page,
              pageSize: params.pageSize,
              ...(params.columns.join(',') !== COLUMN_KEYS.join(',') && {
                columns: params.columns.join(','),
              }),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
