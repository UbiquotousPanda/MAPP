# Implementation Plan: Summary Report

**Branch**: `feature/048-summary-report` (from `measure-module`) | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Design artifacts**: [contracts/api.md](contracts/api.md) · [measure-module-build.md](../../docs/sdd/measure-module-build.md).
No `data-model.md`: no new table. The read decisions are R1 to R5 below.

## Summary

A read-only report on 039's frame. `GET /api/v1/reports/summary` returns the revenue section (figures, Goal coverage,
trend) and the funnel section (stage volumes, conversion cards, conversion trend); `GET /api/v1/reports/summary/league/{table}`
returns one league table, so each refreshes alone (048-C6). `Report.Sheets` feeds 039's export. Nothing is written,
no migration, no SQL of its own: the series come from 049's data path.

## Technical Context

Go 1.27 + TypeScript 5.9/React 19; no new dependency. Depends on code that is not on `measure-module` yet: 046 (#62),
047 (#75), 049 (#82). 050's `attribution.ROI` and `Designated` are merged. Tests: Go on fakes; Vitest + MSW +
vitest-axe; Playwright for US1.

## Research

- **R1 — One data path with 049 (048-C3).** 049 works its series out in `measure/revenue` through package-private
  code (`scopeAndActivities`, `factsByActivity`, `revenueMonths`). Two ways to share it: (a) **preferred** — ask lane B
  for one exported read in `measure/revenue`, `Service.ActivitySeries(ctx, a, f, category) ([]ActivitySeries, error)`:
  per activity in view, its plan, type, owner, attribute values, and per month its actual, projected and goal per
  stage and revenue in USD; (b) **fallback** — 048 reuses 049's ports and adapters (`Facts`, `Goals`, `Categories`,
  `Rates`, the `projection` engine) and repeats the per-activity summing, as 049-C18 copied 040's ranked list, with
  `TestSummary_EqualsRevenueAndFunnel_048_SC002` holding the two equal. (a) is taken (048-C10): lane B exports it after #82 merges. Either way the statements stay fixed: one facts read, one goals read, whatever the activities.
- **R2 — Segments (048-C4).** The active Shell attributes at Plan, Campaign and Activity level come from the frame's
  scope (`measure.Scope.Attributes`), the same source 043 uses; a node's values are on `allwork.Node`. An activity
  takes a Plan or Campaign attribute's value from its ancestor. Several values share the activity's figures equally, or by a % split's own shares (048-C14),
  in exact decimals (`money.SplitEvenly` over the values in label order, the remainder cent to the last, so shares add up exactly).
- **R3 — Cost and ROI (048-C5).** Actual cost per activity is 015's paid in the plans' year (D-357), read once for the
  line items in view through the dashboards' `Spending` read (`SpendByMonth`). ROI is `attribution.ROI(revenue,
  cost)` with `attribution.Designated` naming the model; while no model is designated, ROI is `null` with the reason.
- **R4 — Conversion (048-C7).** Rate = actual of stage n ÷ actual of stage n−1, goal = goal n ÷ goal n−1, both
  recomputed from sums (FR-019), one decimal, half away from zero, `null` on a zero denominator.
- **R5 — Periods.** Months from 047, quarters summed from months with 049's in-progress rule (049-C4); several years
  as 039's frame lays them out.

## Files (this lane's Owns only)

```text
backend/internal/measure/summary/
  model.go ports.go query.go service.go figures.go funnel.go segments.go league.go sheets.go handler.go report.go  # + tests, + summarytest/
backend/internal/app/measure_summary.go          # body of registerSummary; adapters on 049's read (R1), Spending, attribution
frontend/src/features/measure/summary/           # SummaryReport, RevenueSection, FunnelSection, LeagueTable, api.ts, schemas.ts
frontend/e2e/measure-summary.spec.ts
```

With the feature, as 041 and 042 did once lane A agreed: the two operations in `openapi.yaml`, their rules in
`routes_measure.go`, the `notYetServed` lines. Not touched: `measure/revenue` (lane B's; R1's export is asked of
them), `app/measure.go`, `features/measure/index.ts`, the decision log.

## Business rules and the tests that prove them

| Rule | Where | Test |
|---|---|---|
| Performance whole per cent and the four words; No goal on a zero or missing goal (048-C1) | `figures.go` | `TestVarianceWord_048_C1` (table: 99.5, 100, 100.4, 0 goal, no goal) |
| Goal is the activities' sum; Goal coverage = activities' ÷ plans' goals (048-C2) | `figures.go` | `TestGoalCoverage_048_C2` |
| Summary equals Revenue and Funnel stages for the same filters (048-C3, SC-002) | handler | `TestSummary_EqualsRevenueAndFunnel_048_SC002` |
| Stages any model allows, conversion rate and goal from sums, "—" on zero (048-C7) | `funnel.go` | `TestConversion_048_C7` |
| Segments with Not filled in, equal shares that add up exactly or a % split's shares, Total counts each record once (048-C4, C14) | `segments.go` | `TestSegments_048_C4` |
| Five highest then Total over all; "—" values last; ties by name (048-C5) | `league.go` | `TestLeague_048_C5` |
| ROI from 050 with model and basis; "—" with the reason when not configured | `league.go` | `TestROI_048_FR015` |
| Cost and ROI "—" for plans without finance.view, with plans covered (FR-003) | `service.go` | `TestNoFinanceView_048_FR003` |
| Category narrows everything; Uncategorised selectable (048-C8) | `service.go` | `TestCategory_048_C8` |
| Each table reloads alone; own parameters validated (048-C6, FR-004) | `query.go`, handler | `TestParseQuery_048_FR004`, contract test |
| Report states named by the backend (FR-018) | `service.go` | `TestStates_048_FR018` |
| Sheets: every widget in page order, league tables with every value (FR-021) | `sheets.go` | `TestSheets_048_FR021` |
| Contract: 200 shapes, 400 malformed, 401, 403 | handler | `TestSummaryReport_Contract_048` |

Web: one test per state of each section and league table; `schemas.test.ts` with fast-check for the six own
parameters; axe on every state. E2E: US1 as Alex (figures equal the Revenue report's), a league table's segment
change reloading that table only.

## Benchmark

`BenchmarkSummaryReport` in `internal/platform/apibench/measure_summary_test.go`: statements fixed whatever the
number of activities and segments. Recorded 3 Nov 2026 on a Windows laptop with PostgreSQL 17 (CI runs 18 on Linux),
time and statements per request:

| Request | Demo | 028 volume, first run | 028 volume, after `9a01b09a` |
|---|---|---|---|
| Report | 54 ms · 49 | 4.6 s · **146** | 3.3 s · 47 |
| Report, one market | 52 ms · 49 | 4.0 s · **146** | — |
| Report by quarter, uncategorised | 57 ms · 49 | 3.8 s · **146** | — |
| League revenue, cost, ROI | 56–57 ms · 47 | 3.8–4.3 s · 47 | — |
| Export (eight sheets) | 199 ms · 122 | 16.9 s · 219 | — |

- **Statements:** the first volume run grew from 49 to 146, because plan goals were read through each plan's view.
  `9a01b09a` reads them in fixed statements (`plan.WaterfallUSD`); the report is back to 47 at volume.
- **Time:** still over SC-005's 2 s at volume. A CPU profile of the report puts about 91 % of the request in the frame's
  scope read, `measure.Scope` → `allWorkSource.Year`, which builds every plan's campaign tree with each activity's
  summary, completeness, attribute values and line-item facts. Summary pays it twice: once itself and once inside
  `ActivitySeries`. Both are raised with lanes A and B; 048's own code is a small share.

## Constitution check

Spec first ✔ · server works out every figure, ratios from sums ✔ · reuses 046/047/049/050 definitions, defines only
its four ✔ · money exact decimal ✔ · Shell vocabulary (Reports, Summary, Not filled in, Uncategorised) ✔ · palette
tokens, SVG bars and lines, no chart library ✔ · files ≤ 300 lines, comments ≤ 5% ✔ · no new dependency ✔ ·
read-only, no yellow primary button ✔.

## Answers from others (2 Nov)

1. **Lane B: R1 (a), confirmed (048-C10).** `ActivitySeries` comes in lane B's follow-up pull request right after
   #82, together with 049's switch to `measure/ranking`; the variance word moves into that read. Implementing waits for
   it, and builds against #82 after its 2 Nov fixes.
2. **Lane B: lane C adds the two operations itself (048-C11)**, tagging lane B to review. Merge order announced:
   #62 → #75 → #82 on 2 or 3 Nov, then the `ActivitySeries` pull request.
3. **Integrator:** measure-metrics gains "On plan" and "No goal" (048-C1) and Goal coverage's definition (048-C2).
