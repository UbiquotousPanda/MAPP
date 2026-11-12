# Tasks: Fewer reports, each a distinct view (059)

**Input**: [spec.md](spec.md), [plan.md](plan.md). Three lanes with disjoint files; **Phase 1 (lane 3) lands first**
because every page needs the new `ReportKey` type, the catalogue stubs and the shared frame prop. After it, lanes 1,
2 and 3 run in parallel. Tests first in every task; test runs touch only the changed packages and folders, and the
full suites run once before the push (memory: test cadence). Generic UI only from `frontend/src/ui/`.

## File ownership

| Lane | Owns (creates, edits, deletes) |
|---|---|
| **1 — Performance** | `frontend/src/features/measure/performance/` (new), `summary/`, `revenue/` (deals included), `funnel/`; `backend/internal/measure/revenue/query.go`, `ranked.go`, `ranked_sort_test.go`, `handler_test.go`; e2e `measure-performance.spec.ts` (new), `measure-summary.spec.ts`, `measure-revenue.spec.ts`, `measure-attribution-deals.spec.ts`, `attribution.spec.ts` |
| **2 — Purchasing, Plan data and access, Budget and spend** | `frontend/src/features/measure/purchasing/` (new), `plan-data/` (new), `purchase-requests/`, `gsap-link/`, `plan-details/`, `user-access/`, `plan-budget/`; e2e `measure-purchasing.spec.ts` (new), `measure-plan-data.spec.ts` (new), `measure-purchase-requests.spec.ts`, `measure-gsap-link.spec.ts`, `measure-plan-details.spec.ts`, `measure-user-access.spec.ts`, `measure-plan-budget.spec.ts`, `e2e/measure.ts` |
| **3 — Catalogue, redirects, saved views, labels** | `backend/api/openapi.yaml`, `frontend/src/api/generated/`; `backend/internal/measure/*.go` (package root only), `backend/internal/platform/database/migrations/00037_report_consolidation.sql`, `backend/internal/platform/apibench/` tests, the report packages' `ownpass_test.go`, `handler_test.go` and `bench_postgres_test.go` in `gsaplink`, `plandetails`, `useraccess`, and `planbudget/handler_test.go`. `frontend/src/features/measure/{reports.ts, index.ts, redirects.ts, redirects.test.ts, ReportsPage.tsx, ReportsPage.test.tsx, ReportPreview.tsx}`, `features/measure/shared/` (all), `features/measure/approvals/`, `src/app/measure-routes.tsx`, `src/ui/EmptyState/`, `src/testing/fixtures/reports.ts`, `src/features/home/RevenueCard.tsx` (+ test), `src/features/people/CurrencyPicker.test.tsx`. E2e `measure.spec.ts`, `measure-redirects.spec.ts` (new) |

Shared files with one owner: routes (`measure-routes.tsx`), catalogue (`reports.ts`, `catalogue.go`), `index.ts`,
`openapi.yaml`, `shared/*`: lane 3. A lane that needs a change in one asks lane 3 in the pull request.

## Phase 1: Foundation (lane 3, blocks lanes 1 and 2)

- [x] T001 Contract in `backend/api/openapi.yaml`: `ReportKey` (`performance, budget, purchasing, approvals,
  planData`), `ReportPath` (`performance, budget, purchasing, approvals, plan-data`), `ReportOwnStage` + `revenue`,
  `RevenueRankedSort` + `actualCost, roi`, `listReports` and `exportReport` descriptions; `pnpm run api:types`
- [x] T002 `frontend/src/features/measure/reports.ts`: five `REPORT_ROUTES` (`performance`, `budget`, `purchasing`,
  `approvals`, `plan-data`), `REPORT_GROUPS` without `description` (FR-001, FR-012), `REPORT_ABOUT` for five, each
  cut to its question and audience; `shared/api.ts` `REPORT_PATHS`; `src/testing/fixtures/reports.ts` five entries
- [x] T003 `features/measure/index.ts` `REPORT_PAGES` with five keys: `budget` → `PlanBudgetReport`, `approvals` →
  `ApprovalsReport`, and stubs `performance/PerformanceReport.tsx`, `purchasing/PurchasingReport.tsx`,
  `plan-data/PlanDataReport.tsx`, each rendering `ComingSoonReport` until its lane replaces the file
- [x] T004 `ui/EmptyState/EmptyState.tsx`: `onReset` prop adds the secondary "Reset filters" button; one test in
  `EmptyState` tests (button calls `onReset`); `shared/ReportFrame.tsx` uses it
- [x] T005 `shared/ReportToolbar.tsx` and `shared/ReportFrame.tsx`: optional `filters` prop of the report's own
  filter menus, chips and their removal, joined to `FilterBar`'s `menus`, `inUse`, `chips` and Clear filters
  (059-P1); a test in `ReportFrame.test.tsx` that an own filter counts in "Filters (n)" and Clear filters clears it
- [x] T006 `src/app/measure-routes.tsx`: the five report routes (`plan-data` and the rest with `reports.view`); the
  eight old paths routed to redirects (T012 fills `redirectOf`; until then each points to its new path without
  parameters)

**Checkpoint**: typecheck green; lanes 1 and 2 start.

## Phase 2: US1 — Performance (lane 1, P1)

- [ ] T007 Before changing anything, record today's demo figures on `/reports/summary?year=2026` (overview strip,
  ROI and revenue league top five by Country / OU) as the expectations of T015; note any league/ranked mismatch
  for the integrator (plan Analysis 1)
- [ ] T008 Go, tests first: `TestRankedRevenue_SortsByCostAndROI_059_FR003` in `revenue/ranked_sort_test.go`;
  `SortActualCost`, `SortROI` in `revenue/query.go`, `revenueRanking.Key` in `ranked.go`; contract case `sort=roi`
  in `revenue/handler_test.go`
- [ ] T009 `performance/stage.ts` (stage of the address: `revenue`, `mql`, `inq`; unknown → `revenue` with a flag)
  and `performance/StagePicker.tsx` on `ui/SegmentedFilter`, MQL and INQ only when `availableStages` has them;
  delete `funnel/StageSelect.tsx`
- [ ] T010 Category behind Filters (n) (059-P1): `revenue/CategorySelect.tsx` becomes the own filter menu and chip
  passed through `ReportFrame`'s `filters` prop (T005); `CategoryControl` in the toolbar's `end` goes
- [ ] T011 `performance/PerformanceReport.tsx`: `ReportFrame report="performance"`; overview strip from
  `summary/RevenueSection.tsx` (trend removed) and `summary/FunnelSection.tsx`; then the picker; then
  `RevenueBody` (exported from `revenue/RevenueReport.tsx`, deals panel included) or `FunnelBody` (exported from
  `funnel/FunnelReport.tsx`, conversion trend included); unknown stage shows `ui/InlineAlert`. Delete
  `summary/LeagueTable.tsx`, `summary/SummaryReport.tsx`'s page and the `RevenueReport`/`FunnelReport` page
  wrappers. `Performance.module.css` only for layout
- [ ] T012 Ranked list: the `groups` that `revenue/` and `funnel/` pass to `shared/RankedControls` gain the Shell
  attributes from the frame's choices (`attr:<id>`; the API already adds Not filled in), so no `shared/` change;
  Sort by gains Actual cost and ROI on Revenue, ROI's model and cost basis named through `RoiValue` (FR-003)
- [ ] T013 Web tests in `performance/PerformanceReport.test.tsx` with MSW `reply()`: loading, data (overview equals
  the summary fixture), error with Try again, no plans, stage switch changes cards, chart, ranked request and the
  address (`stage=mql`), unknown stage notice, category in Filters (n) and in the export params, Group by attribute
  in the ranked request; axe. Move the page-level cases out of `RevenueReport.test.tsx`, `FunnelReport.test.tsx`
  and `SummaryReport.test.tsx` and delete what the new file repeats (D-425)
- [ ] T014 Existing e2e addresses: `measure-attribution-deals.spec.ts`, `attribution.spec.ts` →
  `/reports/performance…`
- [ ] T015 End to end `e2e/measure-performance.spec.ts` (US1 1–4): overview figures equal T007's; MQL changes cards
  and address; group by Country / OU, sort ROI → top five equal T007's; deals panel opens with its figure; axe.
  Delete `measure-summary.spec.ts` and `measure-revenue.spec.ts`, keeping any figure they assert that the new file
  lacks

## Phase 3: US2 — Purchasing (lane 2, P1)

- [ ] T016 `purchasing/purchasing-tab.ts`: tab of the address (`requests`, `swbs`, `waiting`, `orders`; unknown →
  `requests` with a flag); changing tab drops `sort` and `page`
- [ ] T017 `purchase-requests/`: split `PurchaseRequestsReport.tsx` into an exported overview (cards, status, by
  vendor, by owner) and the grid; `GridToolbar.tsx` → `ui/FilterBar` (search through `SearchField delay`, vendor,
  owner, status as menus, `ColumnChooser` in `end`), its debounce code deleted; `RequestsGrid.tsx` empty state
  through `EmptyState onReset`; the "See GSAP purchase orders" link becomes `tab=orders`
- [ ] T018 `gsap-link/GsapLinkReport.tsx`: export the three tab bodies without the page and its own `Tabs`; delete
  the page wrapper
- [ ] T019 `purchasing/PurchasingReport.tsx`: `ReportFrame report="purchasing"`, overview, `ui/Tabs` Purchase
  requests · Waiting for SWBS · Waiting for GSAP · Purchase orders; unknown tab shows `ui/InlineAlert`
- [ ] T020 `purchasing/PurchasingReport.test.tsx`: each tab renders its widget for the same filters, `tab` in the
  address and the export params, unknown tab notice, loading and error once for the page; axe. Delete the
  page-level cases of `PurchaseRequestsReport.test.tsx` and `GsapLinkReport.test.tsx` the new file repeats
- [ ] T021 End to end `e2e/measure-purchasing.spec.ts` (US2 1–2): overview by status and commitment by vendor
  figures; Waiting for GSAP equals today's rows, `tab=waiting`; invoiced per line equal in the grid and Purchase
  orders; axe. Merge `measure-purchase-requests.spec.ts` and `measure-gsap-link.spec.ts` into it and delete them;
  `e2e/measure.ts` constants stay

## Phase 4: US3 — Old links and saved views (lane 3, P1)

- [ ] T022 Go, tests first in `backend/internal/measure/sections_test.go`:
  `TestSections_SheetsOfTheSectionShown_059_FR011`, `TestSections_PeopleNeedsAccessManage_059_FR007`,
  `TestSections_EveryOldWidgetHasAHome_059_SC002`
- [ ] T023 `measure/model.go` five keys (old ones kept as section keys); `catalogue.go` five entries with selector,
  opening value, frame controls and sections, `Register` accepting section keys, `Get` composing; new
  `sections.go` (`Sheets`, `Params`, `Describe` "Section", `Available`). No change in `internal/app/`
- [ ] T024 Go tests to the new keys and paths (plan Analysis 5): `measure/handler_test.go`,
  `views_handler_test.go`, `openable_test.go`, `filter_test.go`, `catalogue_test.go`, `scope_per_role_test.go`,
  `views_test.go`, `export_test.go`, `export_controls_test.go`, `frame_test.go`, `store_postgres_test.go`;
  `gsaplink|plandetails|useraccess` `ownpass_test.go`, `handler_test.go`, `bench_postgres_test.go`;
  `planbudget/handler_test.go`; `platform/apibench/reports_test.go`, `measure_purchasereport_test.go`,
  `measure_revenue_test.go`, `measure_summary_test.go`. One new contract case: export `plan-data?tab=people` as a
  non-administrator → 403
- [ ] T025 Migration `backend/internal/platform/database/migrations/00037_report_consolidation.sql` (plan R3): drop
  CHECK, defaults, names with the old report's name and the 60-character cut, query rewrite, key, CHECK with five
  keys; no `-- +goose Down`. Run once on a demo database with views on all nine keys (a name clash, two defaults,
  a 60-character name) and record the before and after counts in the pull request (SC-003)
- [ ] T026 `features/measure/redirects.ts` `redirectOf` and `redirects.test.ts` (one table-driven test, eight rows,
  FR-009); wire into `measure-routes.tsx` with `<Navigate replace>`
- [ ] T027 Links and caches: `home/RevenueCard.tsx` (+ test) → `/reports/performance`;
  `people/CurrencyPicker.test.tsx` frame key `'performance'`; `shared/*.test.tsx` router paths to the new
  addresses where they name a report
- [ ] T028 End to end `e2e/measure-redirects.spec.ts` (US3 1–2): `/reports/revenue?year=2026&group=owner` lands on
  Performance with `stage=revenue`, year 2026, Group by Owner and a known revenue figure; `/reports/gsap-link?tab=orders`
  lands on Purchasing › Purchase orders; a view saved on Performance with `stage=mql` reopens on MQL.
  `measure.spec.ts`: addresses to `/reports/budget` and `/reports/performance`

## Phase 5: US4 — Plan data and access (lane 2, P2) and Budget and spend (lane 2)

- [ ] T029 `plan-details/PlanDetailsReport.tsx` and `user-access/UserAccessReport.tsx`: export their bodies; Reset
  filters through `EmptyState onReset`; delete the page wrappers
- [ ] T030 `plan-data/PlanDataReport.tsx`: `ui/Tabs` Data completeness · People on `tab`; People only with
  `useAccess()` holding `access.manage`; People in `ReportFrame filters={false}`; unknown or refused tab falls back
  with `ui/InlineAlert`
- [ ] T031 `plan-data/PlanDataReport.test.tsx`: both tabs for an administrator, People hidden for a viewer, `tab` in
  the address; axe. Delete the repeated page-level cases of `PlanDetailsReport.test.tsx` and
  `UserAccessReport.test.tsx`. Move `measure-plan-details.spec.ts` and `measure-user-access.spec.ts` into
  `e2e/measure-plan-data.spec.ts` (P2: no new e2e, keep the existing assertions)
- [ ] T032 `plan-budget/PlanBudgetReport.tsx` `report="budget"`; `PlanBudgetReport.test.tsx` and
  `e2e/measure-plan-budget.spec.ts` to `/reports/budget` (FR-004)

## Phase 6: Labels and filter bars (lane 3, parallel with phases 2–5)

- [ ] T033 `approvals/GridFilters.tsx` → `ui/FilterBar` with `SearchField delay` (debounce code deleted);
  `ApprovalsGrid.tsx` empty state through `EmptyState onReset`; `ApprovalsGrid.test.tsx` keeps its cases
- [ ] T034 FR-012 text: `ReportsPage.tsx` without group subtitles; `REPORT_ABOUT` cut; `ReportFrame` header drops
  the "In view" count where the page's Total rows repeat it; `ReportPreview.tsx` five drawings;
  `ReportsPage.test.tsx` lists five reports (SC-001)

## Phase 7: Close (each lane, then the integrator)

- [ ] T035 Each lane: `pwsh ./scripts/check-changed.ps1`; files within 300 non-blank lines (watch
  `RevenueReport.test.tsx`, 319 today); comment budget
- [ ] T036 Integrator: full suites once; `/speckit-analyze`, then `/speckit-converge`; docs: `design-system.md` and
  `measure-metrics.md` report names, feature map, 059-C1 – C4 and 059-P1 – P3 into the decision log; migration
  number checked against `develop`

## Dependencies

Phase 1 → phases 2, 3, 4, 5, 6 in parallel. Inside lane 3: T022 → T023 → T024; T025 and T026 independent; T028
after T026 and after lanes 1 and 2 have their pages (it runs last). T015 needs T008–T012; T021 needs T017–T019.

Task count: 36 (lane 3: 15, six of them Phase 1; lane 1: 9; lane 2: 10; close: 2).
