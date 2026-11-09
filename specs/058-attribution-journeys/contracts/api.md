# Contract: feature 058

One new read and two own parameters on the export, in `backend/api/openapi.yaml`.

## `GET /api/v1/reports/revenue/activities/{activityId}/deals` — `getRevenueActivityDeals`

Rule `inPlan(reports.view)`. Query: `year` (integer, default this year), `currency` (code, default the
person's), `compare` (an attribution model key, optional), `page` (≥ 1, default 1; 25 deals a page).

`200 ActivityDeals`:

| Field | Type | Meaning |
|---|---|---|
| `activity` | `DealActivity` {id, name, planId, planName} | the activity opened |
| `year` | integer | |
| `model` | `AttributionModel` | the designated model, with its sentence |
| `comparison` | `AttributionModel` or null | the model compared with, when asked and different |
| `credited` | `Money` | this activity's shares added up, in the display currency |
| `comparisonCredited` | `Money` or null | the same under the comparison model |
| `booked` | `Money` or null | the deals booked on this activity, in the display currency; null when none |
| `reason` | `""` · `noData` · `notApproved` | why there are no deals |
| `heldFacts` | integer | held facts in scope on its deals' journeys or on the activity |
| `withoutRate` | integer | deals left out for a currency without a rate |
| `total` · `page` · `size` | integer | paging, size always 25 |
| `deals` | `Deal[]` | this page, by share desc, then date desc |

`Deal`: `id`, `source`, `reference`, `date` (date), `bookedOn` (`DealActivity`), `amount` (`Money`, as booked),
`usd` (`Money`), `rate` (string per 1 USD or null when USD), `journey` (`none` · `shared` · `unattributed`),
`steps` (`DealStep[]`, the sharing steps in date order), `share` (`Money`, display currency),
`comparisonShare` (`Money` or null).

`DealStep`: `activity` (`DealActivity`), `date`, `kinds` (`inq` · `mql` · `sessions` · `visits` ·
`engagementTouches`, at least one), `share` (`Money`, USD), `comparisonShare` (`Money` or null),
`thisActivity` (boolean).

Errors: 400 `validation_failed` (year, compare, page), 401, 404 `not_found` (unknown, binned or outside the
scope, alike), default envelope.

## `GET /api/v1/reports/{report}/export`

Two own parameters: `activity` (`ReportOwnActivity`, an activity ID: the `deals` widget of the Revenue report)
and `compare` (`ReportOwnCompare`, a model key). The widget key is `deals`.
