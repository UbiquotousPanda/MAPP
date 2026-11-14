import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { toQuery, writeAddress } from '../shared';
import type { ReportAddress } from '../shared';

export type SummaryReportData = components['schemas']['SummaryReport'];
export type RevenueSectionData = SummaryReportData['revenue'];
export type FunnelSectionData = SummaryReportData['funnel'];
export type SummaryTrendPeriod = components['schemas']['SummaryTrendPeriod'];
export type SummaryFigure = components['schemas']['SummaryFigure'];

export interface SummaryOwn {
  category?: string;
}

export function useSummaryReport(address: ReportAddress, own: SummaryOwn) {
  return useQuery({
    queryKey: ['reports', 'summary', writeAddress(address).toString(), own],
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/summary', { params: { query: { ...toQuery(address), ...own } } }),
      ),
    placeholderData: keepPreviousData,
  });
}
