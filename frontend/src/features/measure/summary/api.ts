import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components } from '@/api/generated/schema';
import { toQuery, writeAddress } from '../shared';
import type { ReportAddress } from '../shared';
import type { LeagueTableKey } from './schemas';

export type SummaryReportData = components['schemas']['SummaryReport'];
export type RevenueSectionData = SummaryReportData['revenue'];
export type FunnelSectionData = SummaryReportData['funnel'];
export type SummaryTrendPeriod = components['schemas']['SummaryTrendPeriod'];
export type SummaryLeague = components['schemas']['SummaryLeague'];
export type SummaryFigure = components['schemas']['SummaryFigure'];

export interface SummaryOwn {
  category?: string;
  stage?: 'mql';
}

export interface LeagueOwn {
  category?: string;
  segment?: string;
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

/** One league table on its own request, so changing its segment reloads only it. */
export function useSummaryLeague(table: LeagueTableKey, address: ReportAddress, own: LeagueOwn) {
  return useQuery({
    queryKey: ['reports', 'summary', 'league', table, writeAddress(address).toString(), own],
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/summary/league/{table}', {
          params: { path: { table }, query: { ...toQuery(address), ...own } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
