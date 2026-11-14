// The Reports area (features 039–050): every report's page from the start, so no lane edits this file (D-369).
import type { ComponentType } from 'react';
import { PlanBudgetReport } from './plan-budget/PlanBudgetReport';
import { ApprovalsReport } from './approvals/ApprovalsReport';
import { PerformanceReport } from './performance/PerformanceReport';
import { PurchasingReport } from './purchasing/PurchasingReport';
import { PlanDataReport } from './plan-data/PlanDataReport';
import type { ReportKey } from './reports';

export { ReportsPage } from './ReportsPage';
export { REPORT_ROUTES } from './reports';
export type { ReportKey } from './reports';
export { RankedList, ReportTable, ReportWidget } from './shared';
export type { RankedColumn, RankedData } from './shared';
export type { ReportTableData } from './shared';
export { useSummaryReport } from './summary/api';

export const REPORT_PAGES: Record<ReportKey, ComponentType> = {
  performance: PerformanceReport,
  budget: PlanBudgetReport,
  purchasing: PurchasingReport,
  approvals: ApprovalsReport,
  planData: PlanDataReport,
};
