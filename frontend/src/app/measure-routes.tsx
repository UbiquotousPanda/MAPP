import type { RouteObject } from 'react-router';
import type { ReportKey } from '@/features/measure';
import type { Permission } from '@/session/access';
import type { PageHandle } from '@/session/page-handle';
import { RequirePermission } from '@/session/RequirePermission';
import { OldReportRedirect, ReportPage, ReportsPage } from './pages';

interface ReportRoute {
  key: ReportKey;
  path: string;
  title: string;
  permission: Permission;
}

// Every report's address, listed here so the feature loads only when opened.
const REPORTS: ReportRoute[] = [
  { key: 'performance', path: 'performance', title: 'Performance', permission: 'reports.view' },
  { key: 'budget', path: 'budget', title: 'Budget and spend', permission: 'reports.view' },
  { key: 'purchasing', path: 'purchasing', title: 'Purchasing', permission: 'reports.view' },
  { key: 'approvals', path: 'approvals', title: 'Approvals', permission: 'reports.view' },
  { key: 'planData', path: 'plan-data', title: 'Plan data and access', permission: 'reports.view' },
];

// The nine reports before feature 059 that now live in the five; their links and bookmarks keep working.
const OLD_REPORTS = [
  'summary',
  'revenue',
  'funnel',
  'plan-budget',
  'purchase-requests',
  'gsap-link',
  'plan-details',
  'user-access',
];

export const MEASURE_ROUTES: RouteObject[] = [
  {
    path: '/reports',
    element: (
      <RequirePermission permission="reports.view">
        <ReportsPage />
      </RequirePermission>
    ),
    handle: { title: 'Reports' } satisfies PageHandle,
  },
  ...REPORTS.map((report) => ({
    path: `/reports/${report.path}`,
    element: (
      <RequirePermission permission={report.permission}>
        <ReportPage reportKey={report.key} />
      </RequirePermission>
    ),
    handle: { title: report.title, wide: true } satisfies PageHandle,
  })),
  ...OLD_REPORTS.map((path) => ({ path: `/reports/${path}`, element: <OldReportRedirect /> })),
];
