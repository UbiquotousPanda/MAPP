import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import { downloadFromApi } from '@/api/download';
import type { components, operations } from '@/api/generated/schema';
import type { ReportKey } from '../reports';
import { toQuery, writeAddress } from './report-address';
import type { ReportAddress } from './report-address';

export type ReportCatalogue = components['schemas']['ReportCatalogue'];
export type ReportFrame = components['schemas']['ReportFrame'];
export type ReportChoices = components['schemas']['ReportChoices'];
export type ReportAttributeGroup = components['schemas']['ReportAttributeGroup'];
export type Money = components['schemas']['Money'];
export type ExportFormat = 'xlsx' | 'csv';
export type ReportView = components['schemas']['ReportView'];
type ReportViewPage = components['schemas']['ReportViewPage'];
type ReportViewCreate = components['schemas']['ReportViewCreate'];
type ReportViewUpdate = components['schemas']['ReportViewUpdate'];

type ReportPath = operations['exportReport']['parameters']['path']['report'];

const REPORT_PATHS: Record<ReportKey, ReportPath> = {
  performance: 'performance',
  budget: 'budget',
  purchasing: 'purchasing',
  approvals: 'approvals',
  planData: 'plan-data',
  planBudget: 'plan-budget',
  purchaseRequests: 'purchase-requests',
  planDetails: 'plan-details',
  gsapLink: 'gsap-link',
  userAccess: 'user-access',
  summary: 'summary',
  revenue: 'revenue',
  funnel: 'funnel',
};

export const REPORTS_KEY = ['reports'] as const;

export function useReportCatalogue() {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'catalogue'],
    queryFn: () => call(api.GET('/api/v1/reports')),
  });
}

/** The frame of a report for the address: choices, In view and what was left out (contracts/ui.md keys). */
export function useReportFrame(report: ReportKey, address: ReportAddress) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'frame', report, writeAddress(address).toString()],
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/frame', { params: { query: { report, ...toQuery(address) } } }),
      ),
    placeholderData: keepPreviousData,
  });
}

type ExportQuery = NonNullable<operations['exportReport']['parameters']['query']>;

const OWN_VALUES = [
  'sort',
  'tab',
  'group',
  'q',
  'drill',
  'statusType',
  'columns',
  'category',
  'revenueBy',
  'performanceBy',
  'costBy',
  'roiBy',
  'activity',
] as const;
const COMPARE_MODELS = [
  'firstTouch',
  'lastTouch',
  'equallyDistributed',
  'linearTimeDecay',
  'uShaped',
] as const;
const OWN_LISTS = [
  'recordType',
  'approver',
  'outcome',
  'vendor',
  'requestOwner',
  'status',
] as const;

/** The report's own parameters on screen (sort, tab, search, a ranked list's group and drill, a grid's filters). */
function ownQuery(params?: URLSearchParams): Partial<ExportQuery> {
  const query: Partial<ExportQuery> = {};
  for (const name of OWN_VALUES) {
    const value = params?.get(name);
    if (value) query[name] = value;
  }
  for (const name of OWN_LISTS) {
    const values = params?.getAll(name) ?? [];
    if (values.length > 0) query[name] = values;
  }
  const order = params?.get('order');
  if (order === 'asc' || order === 'desc') query.order = order;
  const stage = params?.get('stage');
  if (stage === 'inq' || stage === 'mql') query.stage = stage;
  const compare = COMPARE_MODELS.find((m) => m === params?.get('compare'));
  if (compare) query.compare = compare;
  return query;
}

/** The report, or one widget of it, as a file through 039's one export. */
export function downloadReport(
  report: ReportKey,
  address: ReportAddress,
  format: ExportFormat,
  options: { widget?: string; own?: URLSearchParams } = {},
): Promise<string> {
  const { widget, own } = options;
  return downloadFromApi(
    api.GET('/api/v1/reports/{report}/export', {
      params: {
        path: { report: REPORT_PATHS[report] },
        query: { ...toQuery(address), ...ownQuery(own), format, ...(widget && { widget }) },
      },
      parseAs: 'blob',
    }),
  );
}

const viewsKey = (report: ReportKey) => ['reports', 'views', report] as const;

export function useReportViews(report: ReportKey) {
  return useQuery({
    queryKey: viewsKey(report),
    queryFn: () =>
      call(
        api.GET('/api/v1/reports/{report}/views', {
          params: { path: { report: REPORT_PATHS[report] } },
        }),
      ),
  });
}

/** A saved view goes into the list at once, so "Modified" does not flicker while the list reloads. */
function useViewsRefresh(report: ReportKey) {
  const queryClient = useQueryClient();
  return {
    remember: (view: ReportView) =>
      queryClient.setQueryData<ReportViewPage>(viewsKey(report), (page) =>
        page ? { ...page, items: [...page.items.filter((v) => v.id !== view.id), view] } : page,
      ),
    refresh: () => queryClient.invalidateQueries({ queryKey: viewsKey(report) }),
  };
}

export function useCreateReportView(report: ReportKey) {
  const { remember, refresh } = useViewsRefresh(report);
  return useMutation({
    mutationFn: (body: ReportViewCreate) =>
      call(
        api.POST('/api/v1/reports/{report}/views', {
          params: { path: { report: REPORT_PATHS[report] } },
          body,
        }),
      ),
    onSuccess: remember,
    onSettled: refresh,
  });
}

export function useUpdateReportView(report: ReportKey) {
  const { remember, refresh } = useViewsRefresh(report);
  return useMutation({
    mutationFn: ({ viewId, body }: { viewId: string; body: ReportViewUpdate }) =>
      call(
        api.PATCH('/api/v1/reports/{report}/views/{viewId}', {
          params: { path: { report: REPORT_PATHS[report], viewId } },
          body,
        }),
      ),
    onSuccess: remember,
    onSettled: refresh,
  });
}

export function useDeleteReportView(report: ReportKey) {
  const { refresh } = useViewsRefresh(report);
  return useMutation({
    mutationFn: (viewId: string) =>
      call(
        api.DELETE('/api/v1/reports/{report}/views/{viewId}', {
          params: { path: { report: REPORT_PATHS[report], viewId } },
        }),
      ),
    onSettled: refresh,
  });
}
