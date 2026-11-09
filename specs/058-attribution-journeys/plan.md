# Implementation Plan: How attributed revenue is made up (058)

**Branch**: `feature/058-attribution-journeys` from `integrate/measure-into-develop` (the #165 head) · **Spec**:
[spec.md](spec.md) · **Decision**: D-409 · **Lane**: A (`measure/attribution`, 039's shared files)

Short, as the build guide §8 asks: the rules and the tests that prove them, the reads and their scope filter,
the permission, the benchmark. [contracts/api.md](contracts/api.md) has the operation.

## Technical context

Go (go.mod), Gin in handlers, PostgreSQL through sqlc, React 19 + TypeScript, TanStack Query, Radix `SidePanel`.
No new table, no migration: every figure is worked out at read time from 046's facts (050 FR-009). Constitution
check: one function per rule (V), tests first on fakes with PostgreSQL only for scope isolation (VI), scope as
tenant with 404 for what the viewer can't see (VII), one yellow marker per panel (IX, X).

## R1. Where the code goes

| Part | Files | Why there |
|---|---|---|
| Crediting rules R3, R5, R7, R11 | `measure/attribution/credit.go`, `journeys.go`, new `steps.go` | 050's package owns the rules; 049 and 048 keep reading `Crediting.Credit` |
| The deals read | `measure/attribution/deals.go` (service), `deals_model.go`, `deals_handler.go`, `deals_sheet.go` | the per-step view of the same crediting; a new package would duplicate the fact reads |
| Reads | `queries/measure_attribution.sql`, `store_postgres_facts.go`, `attributiontest/store.go`, `crediting_test.go`'s `factStore` | one owner for the attribution reads |
| Route rule | `access/routes_measure.go` | `inPlan(authz.ReportsView)` |
| Wiring | `app/measure_attribution.go` (`dealsArea`), `app/measure_revenue.go` (the export port) | adapters live in `app` |
| Web | `features/measure/revenue/deals/` (panel, card, steps, `api.ts`, `address.ts`, tests), one `render` hook in `shared/RankedList.tsx` | the panel belongs to Revenue; the cell button is the shared list's |
| Export | `revenue/sheets.go` adds the `deals` sheet through a port; `openapi.yaml` `exportReport` gains `activity` and `compare` | 039's export writes every widget |

## R2. Reads (sqlc, `queries/measure_attribution.sql`), each filtered by `activity_in_scope`

| Query | Change | Scope-isolation test |
|---|---|---|
| `AttributionConversions` | returns the fact `id`, `source_reference` and the source's name (join `performance_sources`) | existing `…_050_C4`, extended to the new columns |
| `AttributionTouches` | `DISTINCT` over (journey, activity, date, **stage, web_metric**) so Go sees each kind; still no revenue, held or replaced facts | existing `…_050_C4` |
| `AttributionHeldFacts` (new) | count of held facts in scope whose journey is one of the refs, or that sit on the activity | `TestPostgresStore_HeldFactsStayInScope_058_FR021` |
| `AttributionActivityNames` (new) | id, name, status, plan id and plan name of the given activities in scope, via initiatives › campaigns › plans | `TestPostgresStore_NamesOutsideTheScopeAreMissing_058_FR014_FR016` |

Statements per request: four reads plus settings and rates, whatever the number of deals, steps or pages (FR-025);
`TestDeals_StatementsDoNotGrow_058_FR025` counts the fake's calls at 1, 10 and 100 deals.

## R3. Crediting changes (Go, `measure/attribution`)

- `JourneyTouch` gains `Kind` (stage or web metric). `steps(touches)` collapses a journey's touches to one
  `Touch` per activity and day (R3) and sorts by date, then activity ID (R5); `Attribute` sorts the same way, so
  the fake and PostgreSQL agree on a same-day tie.
- `Shares(c, m) []Share` gives each sharing step its share (R6, R7: cents × weight ÷ total, rounded down, the
  rest to the latest largest weight); `Attribute` sums them per activity. The five-model and residual tests
  (050 FR-003, FR-005) stay and `TestShares_PerStep_FiveModels_058_FR009` checks the per-step figures.
- `conversions()` converts deals to US dollars **as parts** per (activity, month, currency) in (date, id)
  order with `money.ConvertParts` (R11, FR-010). A currency without a rate leaves the whole group out and
  counts each fact. `TestConvert_DealsAddUpToActual_058_FR010` puts two EUR deals in one activity-month and
  checks their dollars add up to `Convert(sum)`, which is 049's Actual for that row.
- `Credited` is unchanged for 048 and 049; the demo figures (D-400) do not move, since every demo
  activity-month-currency group has one deal.

## R4. The deals read (`Deals.Of(ctx, a, q)`)

```
q: ActivityID, Year (0 = this year), Currency (code, "" = the person's), Compare (Model, "" = none), Page (≥ 1)
1  names   := store.ActivitiesInScope(scope, [q.ActivityID])     → none: errs.NotFound (404, FR-016)
2  model   := settings.Designated; compare = q.Compare unless it equals model
3  facts   := store.Conversions(scope, [activity], year)          (deals on it, or on journeys it touched)
4  touches := store.Touches(scope, refs(facts)); held := store.HeldFacts(scope, activity, refs)
5  rates; deals := conversions(facts, touches, rates) as parts   (R11)
6  for each conversion the activity is concerned in (R12): Shares under model (and compare);
   this activity's share = sum of its steps'; journey none | shared | unattributed (R9, R10)
7  names of every activity in the steps and bookings (one read); display := displays.Display(a, currency)
8  sort by share desc, date desc, id; totals over every deal; page of 25
9  display currency: Display.Parts over the shares in panel order and over the booked amounts (FR-011);
   deal amounts, dollars and step shares stay USD (058-C3)
```

Reason: `notApproved` when the activity's status holds its facts (created · submitted · declined, as 049's
`factsHeld`), else `noData` when no deal; "" otherwise. `withoutRate` and `heldFacts` are counts.

Ports (in `attribution`): `DealStore` (= `FactStore` + `ActivitiesInScope` + `HeldFacts`), `RateSource`
(exists), `Displays` (`Display(ctx, a, code) (money.Display, error)`, answered in `app` by a new exported
`measure.Service.DisplayCurrency`, which is today's private `currency`), `clock.Clock` for the default year.

## R5. Handler and rule

`GET /api/v1/reports/revenue/activities/:activityId/deals` in `deals_handler.go`: `year` an integer (400
otherwise), `currency` a code, `compare` one of `Models()` (400 otherwise), `page` ≥ 1. The service answers
404 `not_found` alike for an unknown, binned or out-of-scope activity, after the route rule
`inPlan(authz.ReportsView)` has already refused what the target lookup cannot see. Contract test
`TestRevenueDealsContract_058_FR024` on `apitest.WithMeasureDemo()`: Alex gets the webinar's two deals and
$18,702.90; Priya (team scope) gets 404; a bad `compare` gets 400.

## R6. Export

`exportReport` gains the own parameters `activity` and `compare`. When `activity` is given, Revenue's `Sheets`
adds a `deals` sheet (one row per deal: source and reference, date, booked on, amount, currency, rate,
US dollars, steps, steps on this activity, share, comparison share) through the port `DealSheets` wired to
`attribution.Deals`; `Describe` adds the notes "Activity", "Attribution model" and "Compared with", and the
scope sentence of FR-015. `Params()` does **not** list `activity`, `compare` or `deals`, so saved views never
keep the panel (FR-007).

## R7. Web

- `shared/RankedList.tsx`: `RankedColumn` gains `render?: (figures, entry) => ReactNode` used for entry rows
  (group totals keep `value`). Revenue's attributed-revenue column renders a button on activity rows with an
  amount: "Attributed revenue of <name>: $18,702.90 — see the deals".
- `revenue/deals/address.ts`: `deals` (activity ID) and `compare` in the search params; opening pushes, closing
  replaces, so Back closes the panel and never reopens it; the `page` parameter is untouched.
- `DealsPanel` on `ui/SidePanel`: title the activity, description the scope sentence; totals; Compare with
  (`ChoiceField`, the four other models); the list of `DealCard`s with `JourneySteps`; footer Export (CSV ·
  Excel through `downloadReport` with `widget: 'deals'`) and Close. States: skeleton; `EmptyState` "No data
  has arrived yet"; `ErrorState` with Try again (refetches the panel only); not found; held note; without-rate
  note; "These figures changed since the report loaded" with Refresh the report when `credited` or the model
  differs from the row that opened it. Steps fold after five.
- Tests with MSW `reply()` on a `src/testing/fixtures/deals.ts` fixture; one per state; axe; Escape returns
  focus to the cell button; `e2e/measure-attribution-deals.spec.ts`.

## R8. Benchmark

`BenchmarkDeals_058_FR025` on fakes, as `plandetails/bench_test.go` does, with an activity concerned in 500
deals of 6 steps each; recorded in the pull request.

## Complexity tracking

None: no new table, no shared file beyond `RankedList.tsx` (one optional prop), `routes_measure.go` (one rule),
`openapi.yaml` and `measure/service.go` (one method exported).
