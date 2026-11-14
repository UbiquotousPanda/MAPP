# Tasks: Attribution and ROI (050)

**Input**: [spec.md](spec.md), [plan.md](plan.md). Heavy runs wait for the end-of-day batch.

## Phase 1: Crediting and ROI (US2, US3)

- [X] T001 [US2] Tests first: `TestCredit_FiveModels_050_FR003`, `TestCredit_ResidualExact_FR005`,
  `TestCredit_SingleTouchLateAndUnmatched_FR004_FR006`; [US3] `TestROI_FR007`
- [X] T002 `backend/internal/measure/attribution/model.go`, `credit.go`, `roi.go`

## Phase 2: The designated model (US1)

- [X] T003 Migration `00036_attribution_settings.sql`, `queries/measure_attribution.sql`, sqlc; store, PostgreSQL store,
  fake, store set
- [X] T004 Tests first `TestSettings_FR001_FR002`; `service.go`, `kinds.go` (logged, never removed), `handler.go`;
  `openapi.yaml`; route rules; `history_access` (Manage settings); wiring `app/measure_attribution.go`;
  `TestAttributionContract`; `pnpm run api:types`
- [X] T005 Web: `features/attribution/AttributionSettingsPage.tsx` (its own small feature, so Settings does not load
  all of Measure) with the confirmation; Settings section and
  route; tests

## Phase 3: Labels for 048 and 049 (US3)

- [X] T006 `features/measure/shared/RoiValue.tsx`: ROI with its model and cost basis, "—" with the reason; tests

## Phase 4: After 046 merges (blocked: 050-Q1)

- [X] T007 Read 046's revenue facts and journeys into `attribution.Conversion` (050-C3, 050-C4): `Crediting.Credit`
  for 048 and 049, the facts reader in the attribution store and its fake, `TestCrediting_*`, scope-isolation test
- [X] T008 e2e `frontend/e2e/attribution.spec.ts`: Revenue credits the seeded journeys and names the model and
  cost basis (US1–US3); Last touch chosen in Settings restates Revenue, its CSV export and Summary (US4, SC-002)

## Phase 5: Credited revenue and ROI in 048 and 049 (FR-007, FR-008, FR-010)

- [X] T009 Contract: Revenue's ranked figures gain `attributedRevenue` and its reason, `noFinancialAccess`,
  `noActualCost` and `noData` reasons, and the list an `attribution` stamp (model, basis); `pnpm run api:types`
- [X] T010 `attribution.Stamp`, `PaidInYear` (the actual cost of FR-007, read once for 048 and 049) and
  `measure.Scope.SeesFinanceOf`; 049's ranked list reads `Crediting.Credit` and the payments, ROI on each entry's
  sums; the export names the model and basis; `TestRankedRevenue_ROI*`
- [X] T011 048's ROI league divides credited revenue by actual cost and names the model, each dash with its reason;
  `TestLeague_CostAndROI_048_FR015_050_FR010`, `TestLeague_ROIDashSaysWhy_048_FR015_050_FR007`
- [X] T012 Web: Revenue's ranked list shows attributed revenue and names the model and basis beside it and ROI;
  Summary's fixtures and tests name the model. Lane D's two `wavebqa` ROI expectations follow (rule 7)
