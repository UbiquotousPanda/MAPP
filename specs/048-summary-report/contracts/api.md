# API contract: Summary Report (048)

For the wave B contract in `backend/api/openapi.yaml`, following 039's convention: `GET /api/v1/reports/<path>` returns
the report's widgets and `measure.Report.Sheets` feeds the shared export. One error envelope; 401 signed out; 403
`forbidden` when the route rule refuses.

## Operations

| Operation | Rule (`access/routes_measure.go`) | Answers |
|---|---|---|
| `GET /api/v1/reports/summary` | `need(authz.ReportsView)` | 200 `SummaryReport`; 400 for a malformed frame filter, `category` or `stage` |
| `GET /api/v1/reports/summary/league/{table}` | `need(authz.ReportsView)` | 200 `LeagueTable`; 400 for an unknown `table` or a malformed `segment`; 200 with no rows for a segment that matches nothing |

`table` is `revenue`, `performance`, `cost` or `roi`. Exports go through `GET /api/v1/reports/summary/export` of 039,
widgets `revenue`, `trend`, `funnel`, `conversion`, `leagueRevenue`, `leaguePerformance`, `leagueCost`, `leagueRoi`.

## Query

039's report filter (`year`, `plan`, `planType`, `team`, `owner`, `activityType`, `activityStatus`, `attr`,
`period`, `currency`, `table`) plus:

| Parameter | Meaning | Default |
|---|---|---|
| `category` | Activity category ID, or `uncategorised` | all categories |
| `stage` | Conversion trend stage: `mql` or `revenue` | first conversion stage the models allow |
| `segment` | League operation only: a Shell attribute ID at Plan, Campaign or Activity level | first Activity-level attribute |

In the page address the four league segments are `revenueBy`, `performanceBy`, `costBy` and `roiBy`; the web sends
each one as `segment` to its own league request.

## Schemas

```yaml
SummaryReport:
  revenue:
    periodLabel: string                       # "FY 2026"
    actualOrProjected: Money|null
    goal: Money|null
    performance: int|null                     # whole per cent
    variance: abovePlan|onPlan|belowPlan|noGoal   # 048-C1
    goalCoverage: { stage: inq|mql|revenue, percent: int|null }[]   # 048-C2
    trend: TrendPeriod[]
  funnel:
    stages: { stage, actualOrProjected: Figure|null, goal: Figure|null, performance: int|null, variance }[]
    conversions: { stage, rate: string|null, goal: string|null, variance }[]   # one decimal, "12.5"
    trend: { stage, periods: { key, label, state: actual|inProgress|projected, rate: string|null, goal: string|null }[] }
    plansWithoutStage: int                    # plans whose model lacks a shown stage (049-C11)
  categories: { id, name }[]                  # with uncategorised
  states: string[]                            # the report states that apply (FR-018)
  financeCovers: { plans: int, of: int }
  performanceAsOf: date-time|null             # when performance data was last loaded (client 016 FR-031)

TrendPeriod: { key, label, state: actual|inProgress|projected, actual: Money|null, projected: Money|null, goal: Money|null }
Figure: Money for revenue, an integer count for inq and mql

LeagueTable:
  table: revenue|performance|cost|roi
  segment: { id, label, level }
  segments: { id, label, level }[]            # the choices
  rows: { key, name, value: Figure|int|null, trend: (Money|int|null)[] }[]   # the five highest; "none" key is Not filled in
  total: Figure|int|null                      # over all values, each record once (048-C4, C5)
  roi: { model: string, basis: actual|planned }|null   # named next to ROI; null with reason when not configured
  reason: string|null                         # "Attribution is not configured yet", "No cost recorded"
```

`Money` is `{amount, currency}` in the display currency at the current rate (D-303); `null` shows "—".

## Sheets for the shared export

| Widget key | Sheet | Columns |
|---|---|---|
| `revenue` | Revenue against goal | figure, value |
| `trend` | Revenue trend | period, state, actual, projected, goal |
| `funnel` | Funnel stages | stage, actual or projected, goal, performance, variance |
| `conversion` | Conversions | stage, rate, goal, variance, then the chosen stage's trend |
| `leagueRevenue`, `leaguePerformance`, `leagueCost`, `leagueRoi` | Top <figure> by <segment> | segment value, figure — **every** value, then Total |

## Not changed by this feature

`measure/revenue` (lane B's; the export of R1 is asked of them), `app/measure.go`, the shared hub files. The two
operations, their rules and `notYetServed` lines are added with the feature if lane A agrees, as in wave A.
