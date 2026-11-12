# Implementation Plan: Fewer reports, each a distinct view (059)

**Branch**: `feature/059-report-consolidation` from `measure-module` · **Spec**: [spec.md](spec.md) · **Lanes**: three
(below), one owner per file

Short, as the build guide §8 asks: the rules and the tests that prove them, the reads and their scope filter, the
permissions. No `research.md` (no real choice left open) and no `data-model.md` (no new table: one migration on
`report_views`).

## Technical context

Go (go.mod), Gin in handlers, PostgreSQL through sqlc and goose; React 19 + TypeScript, TanStack Query, React
Router. Constitution check: no new figure and no new data endpoint (IV, 059-C2); the merge is a catalogue, page,
address and saved-view change plus two enum widenings in the contract (VII contract first). Generic UI only from
`frontend/src/ui/` (F6): `FilterBar`, `SearchField` (its `delay` prop replaces the two hand-written debounces),
`Tabs`, `Select`, `EmptyState`, `InlineAlert`, `SavedViewsMenu` through 039's `shared/SavedViewsMenu`. Tests lean,
per D-425: one test per rule, state and endpoint; no test that repeats one that stays.

## Resolved during planning

- **059-P1** — The Activity category filter on Performance sits behind **Filters (n)** like every other filter
  (product owner, 2026-11-13): it is one of `ui/FilterBar`'s menus, counted in `inUse`, shown as a chip and cleared by
  Clear filters. It no longer sits in the toolbar's `end` slot as `CategoryControl` does today on Revenue, Funnel
  stages and Summary.
- **059-P2** — Old report keys stay in Go as **section keys**. `measure.KeyRevenue`, `KeyFunnel`, `KeySummary`,
  `KeyPurchaseRequests`, `KeyGsapLink`, `KeyPlanDetails` and `KeyUserAccess` keep naming the existing report
  implementations, which still register under them. The catalogue gains the five report keys, and each report lists
  the sections it is made of. The nine `app/measure_<report>.go` wiring files and every report package's `Key()`
  stay unchanged.
- **059-P3** — Default stage and tab: `stage=revenue`, Purchasing `tab=requests`, Plan data and access
  `tab=completeness`. An old Funnel stages address or view without a stage gets `stage=inq`, the first stage in
  funnel order, which is Funnel stages' own default (`report_funnel.go` `stageOf`). An old GSAP link one without a tab
  gets `tab=swbs`, GSAP link's default.

## R1. Where the code goes

| Part | Files | Owner |
|---|---|---|
| Contract | `backend/api/openapi.yaml`: `ReportKey` enum → `performance, budget, purchasing, approvals, planData`; `ReportPath` enum → `performance, budget, purchasing, approvals, plan-data`; `ReportOwnStage` enum + `revenue`; `RevenueRankedSort` enum + `actualCost, roi`; `listReports` and `exportReport` descriptions (no User access sentence; "the export of a merged report holds the section shown, named in About this export"). Then `pnpm run api:types` | Lane 3 (Phase 1) |
| Catalogue and sections (Go) | `backend/internal/measure/model.go` (five new `Key*` constants; old ones kept as section keys, comment says so), `catalogue.go` (five entries, each with its sections; `Register` accepts section keys; `Get(key)` gives the composed report), new `sections.go` (the composed report: `Sheets`, `Params`, `Describe`, `Available`) | Lane 3 |
| Saved-view migration | new `backend/internal/platform/database/migrations/00037_report_consolidation.sql` | Lane 3 |
| Revenue ranked sorts by cost and ROI | `backend/internal/measure/revenue/query.go` (`SortActualCost`, `SortROI`, added to the revenue sorts), `ranked.go` (`revenueRanking.Key`) | Lane 1 |
| Shared web frame | `frontend/src/features/measure/shared/ReportToolbar.tsx` and `ReportFrame.tsx`: an optional `filters` prop of own filter menus and chips that join `FilterBar`'s `menus`, `inUse`, `chips` and Clear filters (059-P1); `shared/api.ts` `REPORT_PATHS` | Lane 3 (Phase 1) |
| Filtered-empty state | `frontend/src/ui/EmptyState/EmptyState.tsx`: prop `onReset` adds the secondary "Reset filters" button. It replaces the five hand-made copies in `RequestsGrid.tsx`, `UserAccessReport.tsx`, `ApprovalsGrid.tsx`, `PlanDetailsReport.tsx` and `ReportFrame.tsx` | Lane 3 (Phase 1) |
| Catalogue and routes (web) | `features/measure/reports.ts` (`REPORT_ROUTES`, `REPORT_GROUPS` without descriptions, `REPORT_ABOUT` cut to its point), `ReportsPage.tsx`, `ReportPreview.tsx` (five drawings), `index.ts` (`REPORT_PAGES` with five keys), `app/measure-routes.tsx` (five routes plus nine redirect routes), new `features/measure/redirects.ts`, `src/testing/fixtures/reports.ts` | Lane 3 |
| Performance page | new `features/measure/performance/` (`PerformanceReport.tsx`, `StagePicker.tsx`, `stage.ts`, `Performance.module.css`, `PerformanceReport.test.tsx`); edits in `summary/` (overview strip only, league tables and the revenue trend removed), `revenue/` (body exported, `CategoryControl` becomes a filter menu, cost and ROI sorts, attribute groups), `funnel/` (body exported, `StageSelect` removed in favour of the picker) | Lane 1 |
| Purchasing page | new `features/measure/purchasing/` (`PurchasingReport.tsx`, `purchasing-tab.ts`, `PurchasingReport.test.tsx`); edits in `purchase-requests/` (body split into overview and grid, `GridToolbar` → `ui/FilterBar`, the GSAP link button becomes the tab) and `gsap-link/` (`GsapLinkBody` without its own `Tabs`) | Lane 2 |
| Plan data and access page | new `features/measure/plan-data/` (`PlanDataReport.tsx`, `PlanDataReport.test.tsx`); edits in `plan-details/` and `user-access/` (bodies exported, Reset filters through `EmptyState`) | Lane 2 |
| Budget and spend | `plan-budget/PlanBudgetReport.tsx` (`report="budget"`) | Lane 2 |
| Approvals filter bar | `approvals/GridFilters.tsx` → `ui/FilterBar` + `SearchField delay`; `ApprovalsGrid.tsx` Reset filters through `EmptyState` | Lane 3 |
| Links into Reports | `features/home/RevenueCard.tsx` → `/reports/performance` | Lane 3 |

## R2. The composed report (Go, `measure/sections.go`)

```
section: Key (old report key) · Value (stage or tab that shows it; "" = always shown) · Label (export note)
         · Widgets (widget keys kept; nil = all) · Keep (own params passed; nil = the section's Params())
         · Requires (permission beyond reports.view; "" = none)
entry:   key, path, name, purpose, frameControls, selector ("stage" | "tab" | ""), opening value, sections
```

| Report | Selector, opening | Sections (Value → old key, widgets) |
|---|---|---|
| `performance` | `stage`, `revenue` | "" → summary [revenue, funnel, conversion], Keep [category] · revenue → revenue (all) · mql, inq → funnel (all) |
| `budget` | — | "" → planBudget |
| `purchasing` | `tab`, `requests` | "" → purchaseRequests [cards, status, byVendor, byOwner] · requests → purchaseRequests [grid] · swbs → gsapLink [swbs, swbsBands] · waiting → gsapLink [waiting] · orders → gsapLink [orders] |
| `approvals` | — | "" → approvals |
| `planData` | `tab`, `completeness` | completeness → planDetails · people → userAccess, Requires `access.manage` |

- `Sheets` exports the sections shown for the address (spec Edge cases; FR-011). Each section gets `f.Own` limited
  to its Keep list or its `Params()`, so Revenue never sees `stage`, PR never sees `tab` and Summary never sees
  `stage=revenue`. A `people` section without `access.manage` answers `errs.Forbidden` (403, the action on a report
  the person can see). An unknown stage or tab falls back to the opening value, as the page does.
- `Params()` = selector + the union of the sections' params, so saved views keep stage, tab and every grid control.
  `Describe` adds "Section: Purchase orders" (FR-011).
- `frameControls`: performance `{period, showOpensOn: campaign}`; purchasing `{}`; planData `{period, showOpensOn:
  activity}` (the People tab uses `PlainReportFrame` on the web, as User access does today).
- `openable` unchanged: no entry has `requires` any more. Catalogue: five items for everyone with `reports.view`.
- Tests on fakes in `measure/sections_test.go`: `TestSections_SheetsOfTheSectionShown_059_FR011`,
  `TestSections_PeopleNeedsAccessManage_059_FR007`,
  `TestSections_EveryOldWidgetHasAHome_059_SC002` lists the nine reports' widget keys and finds each one in a
  section, except Summary's `trend` and four `league*` widgets, which FR-002 and FR-003 remove. The existing
  catalogue, openable, export and views tests change to the new keys. No new tests beside them.

## R3. Saved-view migration (`00037_report_consolidation.sql`, up only)

The latest migration is `00036_attribution_settings.sql`, so this is **00037**. Feature 059 has no reserved number,
so the integrator checks `develop` before merging (build guide §4.6). One goose transaction, in this order:

1. `ALTER TABLE report_views DROP CONSTRAINT report_views_report_check`.
2. **Defaults**: per person and new report, keep the default view with the latest `updated_at`, then the highest
   `id`. Unstar the others (`row_number()` over the mapped key).
3. **Names**: within a person's new report, order the views by their old report's rank: revenue, summary, funnel ·
   purchaseRequests, gsapLink · planDetails, userAccess. A view whose `lower(name)` was already taken gets
   `' (' || old report name || ')'` added, its name cut so the result stays ≤ 60 characters (the column's CHECK).
4. **Query**: summary drops `stage`, `revenueBy`, `performanceBy`, `costBy` and `roiBy` (`regexp_replace`). It
   cannot keep `stage`, which on Performance would switch the whole page. Funnel without `stage` gets `stage=inq`.
   GSAP link without `tab` gets `tab=swbs`. User access gets `tab=people`. Order does not matter, because
   `saved-views.ts` compares addresses whatever their order.
5. **Key**: `planBudget → budget`, `summary|revenue|funnel → performance`, `purchaseRequests|gsapLink → purchasing`,
   `planDetails|userAccess → planData`. Re-add the CHECK with the five keys.

`version` and `updated_*` stay as they are, and the activity log keeps the old report names (it is history).
Constitution VI tests migrations on no database. The review checks the SQL, and the pull request records one run on a
demo database with views on all nine old keys, including a clash and two defaults.

## R4. Redirects (web, `features/measure/redirects.ts`)

`redirectOf(oldPath, search): string` is a pure function with one table:

| Old | New |
|---|---|
| `/reports/summary` | `/reports/performance`, minus `stage` and the four league params |
| `/reports/revenue` | `/reports/performance?stage=revenue` + every param |
| `/reports/funnel` | `/reports/performance?stage=<its stage or inq>` + every param |
| `/reports/plan-budget` | `/reports/budget` + every param |
| `/reports/purchase-requests` | `/reports/purchasing?tab=requests` + every param |
| `/reports/gsap-link` | `/reports/purchasing?tab=<its tab or swbs>` + every param |
| `/reports/plan-details` | `/reports/plan-data?tab=completeness` + every param |
| `/reports/user-access` | `/reports/plan-data?tab=people` + every param |

`measure-routes.tsx` maps each old path to a tiny route element: `<Navigate replace to={redirectOf(...)} />`, with
`useLocation` for the query. Approvals keeps its address. Unit test `redirects.test.ts`, one table-driven test of the
eight rows (FR-009, US3-1, US3-2).

## R5. Web pages

- **Performance** (`performance/PerformanceReport.tsx`): `ReportFrame report="performance"` with the category in
  `filters` (059-P1). The summary's overview strip (`RevenueSection` without its trend, `FunnelSection`). The
  `StagePicker`, a `ui/SegmentedFilter` of Revenue · MQL · INQ, with MQL and INQ only when
  `FunnelReport.availableStages` holds them. It is bound to `stage` through `useOwnParam` and its value checked in
  `stage.ts`; an unknown stage shows `ui/InlineAlert` "This view changed: the stage is no longer offered" and
  `revenue`. Then the chosen stage's body: Revenue's cards, chart with the D-414 Total row, ranked list and deals
  panel, or Funnel's cards, chart, conversion trend and ranked list. The ranked list's Group by lists the Shell
  attributes (`attr:<id>`, Not filled in included, as `ranking/groups.go` already does). Revenue's Sort by gains
  Actual cost and ROI, with ROI's model and cost basis named by `RoiValue` as today. `summary/LeagueTable.tsx`,
  `funnel/StageSelect.tsx` and the revenue trend in `RevenueSection.tsx` are deleted.
- **Purchasing** (`purchasing/PurchasingReport.tsx`): `ReportFrame report="purchasing"` with the PR overview (cards,
  status, by vendor, by owner), then `ui/Tabs` Purchase requests · Waiting for SWBS · Waiting for GSAP · Purchase
  orders on `tab` (`purchasing-tab.ts`). The PR grid's toolbar becomes `ui/FilterBar` (search through `SearchField
  delay`, vendor, owner and status as menus, `ColumnChooser` in `end`). Changing tab resets `sort` and `page`, as
  each tab sorts by its own columns.
- **Plan data and access** (`plan-data/PlanDataReport.tsx`): `ui/Tabs` Data completeness · People on `tab`. People
  shows only when `useAccess()` holds `access.manage`; otherwise `tab=people` falls back with the notice. People uses
  `ReportFrame filters={false}`, as User access does.
- **Budget and spend**: `PlanBudgetReport` with `report="budget"`; nothing else.
- **Reports page**: five cards in three groups (Performance; Budget and spend, Purchasing; Approvals, Plan data and
  access), with no group descriptions (FR-012) and each ⓘ cut to its question and audience.

## R6. Access

No route rule changes: the data endpoints, and `GET /reports/user-access` with `access.manage`, stay. The web route
`/reports/plan-data` needs `reports.view`. People is hidden without `access.manage`, and its API answers 403 as today.
No new scoped store read, so no new scope-isolation test (the existing ones of 040–049 stay).

## R7. Tests (non-negotiable 8, lean per D-425)

| Kind | Test | Owner |
|---|---|---|
| Contract | Existing `measure/handler_test.go` and `views_handler_test.go` contract cases move to the new paths and keys; one new case `exportReport` `plan-data?tab=people` as a non-administrator → 403. `revenue/handler_test.go`: ranked `sort=roi` validates | 3 · 1 |
| Rules (Go, fakes) | R2's three section tests; `TestRankedRevenue_SortsByCostAndROI_059_FR003` in `revenue/ranked_sort_test.go` | 3 · 1 |
| States (web) | Performance: loading, data, error, no plans, stage switch, unknown stage notice, category behind Filters (n). Purchasing: each tab, unknown tab. Plan data: both tabs, People hidden. `EmptyState onReset` | 1 · 2 · 3 |
| Controls | Stage, tab and Group by change the request and survive the address and the export (`downloadReport` params) | 1 · 2 |
| Redirects | `redirects.test.ts` (eight rows); a router test that `/reports/revenue?...` lands on Performance | 3 |
| End to end, a figure each | `e2e/measure-performance.spec.ts` (US1). `e2e/measure-purchasing.spec.ts` (US2: Waiting for GSAP rows and invoiced per line equal between grid and Purchase orders). `e2e/measure-redirects.spec.ts` (US3: `/reports/revenue?year=2026&group=owner` shows Performance with a known revenue figure, and a saved view made on Performance opens with its stage). Each with axe | 1 · 2 · 3 |

## Analysis — risks and what references the old addresses

1. **League equality (SC-004).** League tables (`summary/league.go`) split a record's money between its attribute
   values with their own rounding. The ranked list splits through `ranking/groups.go`. Same split by % share, but ROI
   per group and the "Not filled in" key may differ. Lane 1 records today's demo top fives (revenue, performance,
   cost and ROI by Country / OU) from the Summary page **before** deleting it. If the ranked list gives a different
   order, it goes to the integrator as a figure question (CLAUDE.md "Figures"); this feature defines no new figure.
2. **Users who hold access.manage without reports.view** could open `/reports/user-access` directly before
   (`measure-routes.tsx` gave it `access.manage` only). Every role with `plans.view` was given `reports.view` by
   00030, so this matters only for a custom role. See Q2.
3. **Migration on PostgreSQL only.** A suffixed name that clashes again (someone already has "X (Funnel stages)")
   stops the migration whole; the transaction rolls back and no view is lost. Accepted, and recorded in the pull
   request.
4. **Contract enums shrink.** Old keys and paths leave `ReportKey` and `ReportPath`. The frame, export and views
   endpoints answer 400 or 404 for them, and the web app never sends them after the redirects.
5. **Old addresses in code and tests**, each changed by its owner:
   - E2E: `measure.spec.ts` (`/reports/plan-budget` ×2, `/reports/revenue`) → lane 3. `measure-plan-budget.spec.ts`
     → 2. `measure-purchase-requests.spec.ts` and `measure-gsap-link.spec.ts` (`tab=waiting`, `tab=orders`) merge
     into `measure-purchasing.spec.ts` → 2. `measure-plan-details.spec.ts` and `measure-user-access.spec.ts` move
     to `measure-plan-data.spec.ts` → 2. `measure-summary.spec.ts` and `measure-revenue.spec.ts` (`/reports/revenue`,
     `/reports/funnel`, `/reports/summary`) merge into `measure-performance.spec.ts` → 1.
     `measure-attribution-deals.spec.ts` and `attribution.spec.ts` (`/reports/revenue?…`, `/reports/summary`) →
     lane 1.
   - Web: `home/RevenueCard.tsx` and its test (`/reports/summary`), `purchase-requests/PurchaseRequestsReport.tsx`
     (`/reports/gsap-link?tab=orders`), `summary/SummaryReport.tsx` (`/reports/summary` link), `shared/api.ts`
     `REPORT_PATHS`, `testing/fixtures/reports.ts`, `features/people/CurrencyPicker.test.tsx` (frame cache key
     `'summary'`). Unit tests that only use an old path as the router path keep working but are moved to the new
     path by the folder's owner when touched.
   - Go tests with old export or views paths or `report=` keys: `measure/handler_test.go` (8), `views_handler_test.go`,
     `openable_test.go`, `filter_test.go`, `catalogue_test.go`, `scope_per_role_test.go`, `views_test.go`,
     `export_test.go`, `export_controls_test.go`, `frame_test.go`, `store_postgres_test.go`;
     `gsaplink|plandetails|useraccess/ownpass_test.go`, `…/handler_test.go`, `…/bench_postgres_test.go`,
     `planbudget/handler_test.go`; `platform/apibench/reports_test.go` (5), `measure_purchasereport_test.go`,
     `measure_revenue_test.go`, `measure_summary_test.go`. All lane 3. Section keys keep the report packages'
     own tests unchanged.
   - Docs: `docs/product/design-system.md` report names, `docs/product/measure-metrics.md` report references,
     `docs/sdd/feature-map.md` (integrator).
6. **Files near 300 lines**: `RevenueReport.test.tsx` is 319 today. Lane 1 moves its page-level cases into
   `PerformanceReport.test.tsx` and deletes the duplicates instead of adding to it.

## Open questions

- **Q1** — Group-by on Funnel stages' ranked list: offer the Shell attributes there too? (FR-003 names the
  ranked list; the league tables were revenue-only.) Default: yes, since it is the same `RankedControls`.
- **Q2** — A custom role with `access.manage` but not `reports.view`: give `/reports/plan-data` to either permission
  (People only), or accept that such a role loses User access? Default: accept; no shipped role is affected.
- **Q3** — Should the migration turn a Summary view's league segment (`roiBy=ATTR-3`) into `group=attr:ATTR-3&sort=roi`?
  Default: no; the spec's edge case keeps the filters that still apply and drops the rest.

## Complexity tracking

Shared files touched, each with a single owner: `openapi.yaml`, `measure/catalogue.go`, `measure/model.go`,
`features/measure/index.ts`, `reports.ts`, `app/measure-routes.tsx`, `shared/ReportFrame.tsx`,
`shared/ReportToolbar.tsx`, `shared/api.ts` and `ui/EmptyState` (lane 3, Phase 1); `measure/revenue/` (lane 1).
