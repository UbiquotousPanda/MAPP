# Tasks: How attributed revenue is made up (058)

**Input**: [spec.md](spec.md), decision D-409. Lane A owns `measure/attribution`; the ranked-list cell goes through
039's shared `RankedList`. Tests first in every phase; heavy runs wait for the end-of-day batch. A short `plan.md`
(reads, statements, benchmark) comes before T003 if `/speckit-analyze` asks for one.

## Phase 1: The crediting rules made explicit (FR-008 – FR-010)

- [ ] T001 Tests first in `backend/internal/measure/attribution`: `TestShares_PerStep_FiveModels_058_FR009`,
  `TestShares_LeftoverToLatestLargest_058_R7`, `TestSteps_OnePerActivityAndDay_058_R3`,
  `TestSteps_SameDayByActivityID_058_R5`, `TestConvert_DealsAddUpToActual_058_FR010` (two EUR deals on one
  activity in one month add up to 049's Actual)
- [ ] T002 `credit.go`: `Shares(c, m)` gives each step's share and `Attribute` sums them; steps sorted by date
  then activity ID. `journeys.go`: steps collapsed per activity and day with their stages; deals converted as
  parts per activity, month and currency (`money.ConvertParts`). 050's tests and lane D's `wavebqa` figures stay
  green; any cent that moves is named in the pull request
- [ ] T003 Store: `queries/measure_attribution.sql` — the conversions read returns the fact ID, source name and
  reference; the touches read returns stage and web metric (no `DISTINCT`; Go collapses them); a held-facts count
  by journey reference; activity and plan names by ID in scope. `sqlc generate`; PostgreSQL store,
  `attributiontest` fake and `fakeStore`; scope-isolation tests `TestPostgresStore_*_ScopeIsolation_058_FR014`,
  one per read added or changed

## Phase 2: US1 — the deals panel (P1)

- [ ] T004 Contract first: `getRevenueActivityDeals` in `backend/api/openapi.yaml` (`ActivityDeals`, `Deal`,
  `DealStep`; 404 envelope); rule `inPlan(authz.ReportsView)` in `access/routes_measure.go`; `pnpm run api:types`
- [ ] T005 Service tests on fakes: `TestDeals_DemoJourneys_058_US1_1_2_3`, `TestDeals_AddUpToTheList_058_FR011`
  (USD and EUR, over journeys generated from a fixed seed),
  `TestDeals_StepOutsideScope_058_US1_5_FR014`, `TestDeals_NoJourneyAndUnattributed_058_FR006`,
  `TestDeals_WithoutRateAndHeld_058_FR012_FR021`, `TestDeals_OrderAndPages_058_FR003`, statements pinned (FR-025)
- [ ] T006 `measure/attribution/deals.go` (service) and its handler; names through a port answered in
  `app/measure_attribution.go`; the display currency from 039's frame parsing. Handler tests: 404 alike for out of
  scope, binned and unknown (FR-016); 400 for a bad `year` or `compare`. `TestRevenueDealsContract` through
  `apitest`
- [ ] T007 Web `frontend/src/features/measure/revenue/deals/`: `DealsPanel` on `SidePanel`, `DealCard`,
  `JourneySteps`, `api.ts`, address schema (`deals`, `compare`); the attributed amount as a button in the ranked
  list (039's `RankedList` cell, through lane A). One test per state — loading, deals, no deals, not approved,
  error with Try again, not found, held note, changed since loaded, EUR — plus Escape and focus return; axe
- [ ] T008 End to end `frontend/e2e/measure-attribution-deals.spec.ts`: Alex on the demo data opens *Tellus webinar
  series*' $18,702.90 and *Helix*' $54,000.00, checks deals, steps and totals against the list; axe

## Phase 3: US2 — compare with another model (P2)

- [ ] T009 `TestDeals_CompareLastTouch_058_US2_1`; the `compare` parameter; the Compare with choice and its
  column; web tests

## Phase 4: US3 — export (P3)

- [ ] T010 Contract: `exportReport` gains the widget `deals` and the parameter `activity`; `TestDealsExport_058_US3_1`
  (CSV and Excel, notes, scope sentence); Export in the panel as on the other widgets

## Phase 5: Close

- [ ] T011 Benchmark at 028's volumes for the busiest activity (FR-025); `scripts/check-changed.ps1`;
  `/speckit-converge`
- [ ] T012 Docs: a note under 050-C3 and in D-398 pointing to D-409 (conversion as parts, unmatched facts); 058-Q1
  – Q4 into the decision log as Q-… once answered or numbered; feature-map status
