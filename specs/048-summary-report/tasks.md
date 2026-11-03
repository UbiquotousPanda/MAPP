# Tasks: Summary Report

**Input**: [plan.md](plan.md), [spec.md](spec.md), [contracts/api.md](contracts/api.md). Tests first (constitution VI):
write each test, see it fail, then the code. Only the end-to-end test uses a real database. Lane rules as 041 and 042:
own folders only, plus the contract, route rules and `notYetServed` lines of 048-C11.

## Phase 1: Gates (no code)

- [ ] T001 (#62, #75, #82 merged 2 Nov; #99 open, built against its branch) Gate: #62 (046), #75 (047) and #82 (049, after its 2 Nov fixes) are merged into `measure-module`, and lane B's
  `ActivitySeries` pull request (048-C10) is merged; then merge `origin/measure-module` into this branch
- [x] T002 Read `ActivitySeries` as merged: its fields, its variance word and its goal rule; adjust `contracts/api.md` and
  plan R1 if they differ from what 048-C10 records

## Phase 2: Contract and skeleton

- [x] T003 `backend/api/openapi.yaml`: `getSummaryReport` and `getSummaryLeague` with their schemas and parameters from
  `contracts/api.md`; `routes_measure.go` rules `need(authz.ReportsView)`; two `notYetServed` lines; `pnpm run api:types`
- [x] T004 [P] `summary/model.go` (API types), `ports.go` (`Transactor`, `Scoper`, `Series` over `ActivitySeries`,
  `Spending`, `Attribution`, `Deps`)
- [x] T005 [P] `summary/summarytest/`: fakes with a fixture of activities in two plans with different models, goals at
  INQ and at revenue, an activity without a goal, actual facts before today and projections after, three Shell
  attributes at Plan, Campaign and Activity level with a missing value and a multi-value, paid cost, a plan without
  `finance.view`, attribution configured and not

## Phase 3: User Story 1 — are we on track (P1) 🎯 MVP

- [x] T006 [P] [US1] Tests (rules done 2 Nov: variance, coverage, conversion): `TestVarianceWord_048_C1` (99.5 %, 100 %, 100.4 %, zero goal, no goal),
  `TestGoalCoverage_048_C2`, `TestConversion_048_C7` (rate and goal from sums, zero denominator, mixed models),
  `TestCategory_048_C8`, `TestStates_048_FR018`, `TestNoFinanceView_048_FR003`
- [x] T007 [P] [US1] Tests: contract `TestSummaryReport_Contract_048` (200, 400 for a bad `category` or `stage`, 401,
  403), `TestSummary_EqualsRevenue_048_SC002` against 049's operations on the demo data
- [x] T008 [US1] `query.go`, `figures.go`, `funnel.go`, `service.go`, `handler.go`, `report.go`; `app/measure_summary.go`
  adapters; remove the summary `notYetServed` line
- [x] T009 [P] [US1] Web tests: `RevenueSection`, `FunnelSection` per state (data, loading, no goals, no performance
  data, not approved, filters exclude everything, error), `schemas.test.ts` with fast-check for the six own parameters
- [x] T010 [US1] Web: `schemas.ts`, `api.ts`, `RevenueSection.tsx` (figures, coverage, trend split at today, SVG with the
  chart tokens), `FunnelSection.tsx` (volume blocks, conversion cards, conversion trend), Details links,
  `SummaryReport.tsx` in `ReportFrame`
- [x] T011 [US1] `frontend/e2e/measure-summary.spec.ts` US1 with axe: Alex's figures equal the Revenue report's
- [x] T012 [US1] Checkpoint: the quality checks, comment budget and file length of every touched file; commit

## Phase 4: User Story 2 — league tables (P2)

- [x] T013 [P] [US2] Tests (shares, top five and query done 2 Nov): `TestSegments_048_C4` (inherited values, Not filled in, equal shares adding up exactly,
  Total counting each record once), `TestLeague_048_C5` (five highest, Total over all, "—" last, ties by name),
  `TestROI_048_FR015` (model and basis named; not configured gives the reason), `TestParseQuery_048_FR004`
- [x] T014 [US2] `segments.go`, `league.go`, the league operation in `handler.go`; remove its `notYetServed` line
- [x] T015 [P] [US2] Web tests: `LeagueTable` per state; changing one segment requests only that table
- [x] T016 [US2] Web: `LeagueTable.tsx` with its segment selector and sparkline, four in `RevenueSection`, address
  parameters `revenueBy`, `performanceBy`, `costBy`, `roiBy`; extend the e2e test with one segment change
- [x] T017 [US2] Checkpoint; commit

## Phase 5: User Story 3 — export (P2)

- [x] T018 [P] [US3] Test `TestSheets_048_FR021` (every widget in page order, league tables with every value)
- [ ] T019 [US3] (sheets done; lane A's export forwarding still open) `sheets.go`; ask lane A to add `category`, `stage` and the four segment parameters to `exportReport`
  if the export does not carry them (as #86 did for 042)
- [x] T020 [US3] Checkpoint; commit

## Phase 6: Polish

- [ ] T021 (waits for PostgreSQL) `BenchmarkSummaryReport` in `internal/platform/apibench/measure_summary_test.go` (needs PostgreSQL to run)
- [x] T022 Comment budget and file length of every file touched
- [ ] T023 `/speckit-converge`; spec status Built; merge `measure-module`; pull request with "048 Built", tagging lane B
  for the contract (048-C11) and listing the integrator's measure-metrics changes (048-C1, C2)

## Coverage of the requirements

| Requirement | Tasks |
|---|---|
| FR-001 to FR-004 | T003, T008, T010 |
| FR-005 to FR-011 | T006, T007, T008, T010 |
| FR-012 to FR-015 | T013, T014, T016 |
| FR-016 to FR-020 | T006, T008, T010, T021 |
| FR-021, FR-022 | T018, T019 |
| SC-002 | T007, T011 |
