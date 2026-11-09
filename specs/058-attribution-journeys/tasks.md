# Tasks: How attributed revenue is made up (058)

**Input**: [spec.md](spec.md), [plan.md](plan.md), [contracts/api.md](contracts/api.md), decision D-409. Lane A owns
`measure/attribution`; the ranked-list cell goes through 039's shared `RankedList`. Tests first in every phase;
test runs touch only the changed packages (`-p 1`), heavy runs wait for the end-of-day batch.

## Phase 1: The crediting rules made explicit (FR-008 – FR-010)

- [ ] T001 Tests first in `backend/internal/measure/attribution`: `TestShares_PerStep_FiveModels_058_FR009`,
  `TestShares_LeftoverToLatestLargest_058_R7`, `TestSteps_OnePerActivityAndDay_058_R3`,
  `TestSteps_SameDayByActivityID_058_R5`, `TestConvert_DealsAddUpToActual_058_FR010`
- [ ] T002 `credit.go`: `Shares(c, m)` per step, `Attribute` sums them, steps sorted by date then activity ID; new
  `steps.go` collapses touches per activity and day with their kinds; `journeys.go` converts deals as parts per
  activity, month and currency. 050's tests and lane D's `wavebqa` figures stay green
- [ ] T003 Reads: `queries/measure_attribution.sql` (conversions with id, source and reference; touches with stage
  and web metric; `AttributionHeldFacts`; `AttributionActivityNames`), `sqlc generate`; `store_postgres_facts.go`,
  `attributiontest/store.go` and `crediting_test.go`'s `factStore`; scope-isolation tests
  `TestPostgresStore_HeldFactsStayInScope_058_FR021`, `TestPostgresStore_NamesOutsideTheScopeAreMissing_058_FR014_FR016`

## Phase 2: US1 — the deals panel (P1)

- [ ] T004 Contract first: `getRevenueActivityDeals` with `ActivityDeals`, `Deal`, `DealStep`, `DealActivity` in
  `backend/api/openapi.yaml`; rule `inPlan(authz.ReportsView)` in `access/routes_measure.go`; `pnpm run api:types`
- [ ] T005 Service tests on a hand-rolled `DealStore`: `TestDeals_DemoJourneys_058_US1_1_2_3`,
  `TestDeals_AddUpToTheList_058_FR011` (USD and EUR over journeys from a fixed seed),
  `TestDeals_StepOutsideScope_058_US1_5_FR014`, `TestDeals_NoJourneyAndUnattributed_058_FR006`,
  `TestDeals_WithoutRateHeldAndNotApproved_058_FR012_FR019_FR021`, `TestDeals_OrderAndPages_058_FR003`,
  `TestDeals_NotFoundAlike_058_FR016`, `TestDeals_StatementsDoNotGrow_058_FR025`
- [ ] T006 `deals_model.go`, `deals.go` (`Deals.Of`), `deals_handler.go`; `measure.Service.DisplayCurrency`
  exported; wiring `app/measure_attribution.go`; handler tests for 400s; `TestRevenueDealsContract_058_FR024` on
  `apitest.WithMeasureDemo()` (Alex 200 with $18,702.90, Priya 404, bad compare 400)
- [ ] T007 Web `frontend/src/features/measure/revenue/deals/`: `address.ts`, `api.ts`, `DealsPanel.tsx`,
  `DealCard.tsx`, `JourneySteps.tsx`, `Deals.module.css`; `render` on `RankedColumn` and the cell button in
  `RevenueReport.tsx`; fixture `src/testing/fixtures/deals.ts`; one test per state — loading, deals, no deals,
  not approved, error with Try again, not found, held note, without-rate note, changed since loaded, EUR — plus
  Escape and focus return; axe
- [ ] T008 End to end `frontend/e2e/measure-attribution-deals.spec.ts`: Alex opens *Tellus webinar series*'
  $18,702.90 and *Helix*' $54,000.00, checks deals, steps and totals against the list; axe

## Phase 3: US2 — compare with another model (P2)

- [ ] T009 `TestDeals_CompareLastTouch_058_US2_1`; `compare` in the read and the address; Compare with
  (`ChoiceField`) and the comparison column; web tests

## Phase 4: US3 — export (P3)

- [ ] T010 Contract: `exportReport` gains `activity` and `compare`; `revenue/sheets.go` adds the `deals` sheet
  through the `DealSheets` port (`attribution.Deals.Sheet`), `describe.go` the notes; `TestDealsExport_058_US3_1`
  (CSV and Excel, notes, scope sentence); Export in the panel's footer

## Phase 5: Close

- [ ] T011 `BenchmarkDeals_058_FR025` on fakes; `pwsh ./scripts/check-changed.ps1 -Base origin/integrate/measure-into-develop`;
  `/speckit-converge`
- [ ] T012 Docs: a note under 050-C3 and in D-398 pointing to D-409; feature-map status; D-409 loses *Proposed*
  once Shell confirms 058-Q1 – Q4
