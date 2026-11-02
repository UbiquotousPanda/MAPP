# Measure wave B — QA pass (issue #47)

Lane D. **Status: Checklist prepared 2026-11-02 before the features merge; nothing run yet.**

The same pass as wave A (#46, PR #87 `qa/wave-a-pass`: `docs/sdd/measure-wave-a-qa.md`,
`backend/internal/measure/waveaqa/qa_test.go`), now for Performance data, Projections, Summary, Revenue, Funnel stages
and Attribution: every screen on the demo data **with the Measure demo plan** under the demo roles (every scope, no
financial access), findings raised as issues on the owning feature, critical and high fixed before wave B merges.

## Merge prerequisites

| Section | Must be on `measure-module` first | State 2026-11-02 |
|---|---|---|
| Performance data (046) | PR #62; integrator's `/settings/performance-data` web route (046 `contracts/api.md`:107) and the approvals call to 046's release port (note 2) | Open. Upload, imports, undo and review queue have no web yet (046 T052, T094) |
| Projections (047) | PR #75 (stacked on #62); `/settings/activity-categories` web route (047 T056); category seed (047 T062, lane D) | Open |
| Revenue, Funnel stages (049) | PR #82 (stacked on #75, retargeted); lane B's `ActivitySeries` follow-up with 048-C1's words (048-C10) | Open |
| Summary (048) | 048 built (T001–T023 all open, no PR) after #82 and `ActivitySeries` | Spec, plan, contract, tasks only |
| Attribution (050) | T001–T006 are on `measure-module` (Settings › Attribution, `RoiValue`); T007–T008 need #62 | Figures on 048/049 blocked (050-Q1) |
| Any actual figure | Performance facts in the demo (046 T110; build guide §4.7) | None seeded: load them by hand (How to run) |
| Automated checks | PR #87 (waveaqa, its helpers) | Open |

## Roles and what they must see

| Person | Role | Plans (2026, `-measure`) | Reports offered | Cost, ROI | Export | Performance data | Models, categories, attribution |
|---|---|---|---|---|---|---|---|
| Alex Morgan | Administrator, all markets | Lubricants, Mobility, **Measure demo** | all nine, User access too | yes | yes | change, keys, undo | change |
| Carlos Mendes | Global planner, all markets | Lubricants, Mobility, **Measure demo** | eight | yes | yes | read | read only |
| Priya Raman, Daniel Okoro | Planner (Daniel also Approver), my teams | Lubricants Europe | eight | yes | yes | read | read only |
| Mei Lin | Planner, my teams | Mobility China | eight | yes | yes | read | read only |
| Sara Novak | Viewer, my teams | both | eight | yes | yes | read | read only |
| Lea Santos | Requisitioner, all markets | both, and **Measure demo by scope** (open question 3) | eight | **none** | **no** | read | read only |

Grants from `backend/seed/access.go`:11-57. Eight = wave A's five + Summary, Revenue, Funnel stages.

| Screen | Open | Financial data | Export | Other rights |
|---|---|---|---|---|
| Settings › Performance data (046) | signed in: sources, mappings, template, configuration (contract) | — | — | changes `performance.import`; undo also `settings.manage` (046-C16); keys, aliases, codes `performance.link` (FR-043) |
| Activity Performance section (046, 047) | activity read, scoped; outside scope answers as missing (FR-044, 047 US2-6) | revenue: unstated in spec — confirm | facts `data.export` (contract) | — |
| Models, Activity categories (047) | signed in | — | — | `settings.manage` (FR-023) |
| Summary (048) | `reports.view` (FR-003) | cost and ROI "—" with plans covered; revenue, performance, volumes still show (US2-5) | `data.export` (FR-003, US3-2) | — |
| Revenue (049) | `reports.view` (route rule; FR-025) | unstated in spec — confirm against 039 FR-004 (open question 4) | `data.export` (039 FR-022) | — |
| Funnel stages (049) | `reports.view` | counts only; unstated — confirm | `data.export` | — |
| Settings › Attribution (050) | signed in | — | — | change `settings.manage` (FR-002, US1-3) |

## Automated checks to add — `backend/internal/measure/wavebqa`

Mirror waveaqa: `apitest.New(t, apitest.WithMeasureDemo())` (`apitest.go`:74), the seven e-mails, `measurePlan =
"FY2026 Measure demo – Lubricants Benelux"`, a `loadFacts(t, alex)` helper (source with activity-ID, reference, date,
INQ, MQL, revenue + currency mappings; one CSV for approved Measure activities and one row for Fleet expo Rotterdam,
Submitted), files split to stay under 300 lines. Paths under `/api/v1`.

| Test | Asserts | Endpoints | Source |
|---|---|---|---|
| `TestWaveB_ScopePerRole_FR003` | Each role's frame names only the plans above; ranked lists at `show=plan` name no other plan | `/reports/frame?report={summary,revenue,funnel}`, `/reports/{revenue,funnel}/ranked` | 039 FR-003, 049 FR-002, SC-004, 048 FR-003 |
| `TestWaveB_CatalogueMatchesAccess_FR001` | Summary, Revenue, Funnel stages listed and available; each opens 200 for all seven | `/reports`, `/reports/{summary,revenue,funnel}?year=2026` | 039 FR-001, FR-003 |
| `TestWaveB_NoFinancialAccess_Summary_048_FR003` | Lea: cost and ROI league rows and totals null, `financeCovers` 0 of >0; revenue league and funnel not null | `/reports/summary`, `/reports/summary/league/{cost,roi,revenue}` | 048 FR-003, US2-5 |
| `TestWaveB_NoFinancialAccess_Revenue_039_FR004` | Lea: ranked `actualCost` null; revenue cards' rule to confirm (open question 4) | `/reports/revenue`, `/reports/revenue/ranked` | 039 FR-004, 049 FR-013 |
| `TestWaveB_ExportRights_FR022` | Alex 200, Lea 403 on every wave B export | `/reports/{summary,revenue,funnel}/export`, `/activities/{id}/performance/facts/export` | 039 FR-022, 048 FR-003, 046 contract |
| `TestWaveB_ExportsKeepOwnParams_FR022` | `category`, `stage=mql`, `revenueBy`, `sort=actualRevenue` each give 200 and a file different from the default | `/reports/{revenue,funnel}/export?widget=ranked`, `/reports/summary/export?widget=leagueRevenue` | 039 FR-022, 049 FR-019, 048 FR-004, FR-021 (open question 6) |
| `TestWaveB_SummaryEqualsRevenueAndFunnel_048_SC002` | Same filters and category: Summary revenue = Revenue cards; Summary stages = Funnel cards per `stage` | `/reports/summary`, `/reports/revenue`, `/reports/funnel?stage=` | 048 FR-008, SC-002, 048-C3 |
| `TestWaveB_RankedTotalsEqualSeries_049_SC002` | Ungrouped top-level totals equal the series totals, both reports | `/reports/{revenue,funnel}{,/ranked}` | 049 SC-002 |
| `TestWaveB_LeagueTotalEqualsSection_048_SC003` | Revenue league Total = Summary revenue for every segment offered | `/reports/summary/league/revenue?segment=` | 048 SC-003, 048-C4 |
| `TestWaveB_CategoriesLoseNothing_049_FR020` | Sum over each category + `uncategorised` = all categories, on all three reports | `?category=` | 049 FR-019, FR-020, 048-C8 (needs 047 T062) |
| `TestWaveB_MissingIsNeverZero_FR009` | Without facts: actual null with a reason, conversion null, no 0 where a figure is missing | the three reports, `/activities/{id}/performance` | 049 FR-008, FR-009, 048 FR-017, 047 FR-013 |
| `TestWaveB_RoiNotConfigured_049_FR013` | Every `actualCost`, `roi` null with "Attribution is not configured yet" until 050 T007; then model and basis | `/reports/revenue/ranked`, `/reports/summary/league/roi` | 049 FR-013, 048 FR-015, 050 FR-008 |
| `TestWaveB_ProjectionShape_047_FR008_FR010` | Approved Measure activities: no month past December, none negative, past months actual only, later projected only, current both; stamp with `modelChangedAt`; Retargeting test `noGoal` | `/activities/{id}/performance` | 047 FR-008, FR-010, FR-012, FR-013, SC-005 |
| `TestWaveB_ProjectionsRestated_047_SC002` | Two reads identical; a velocity change by Alex moves `projected` with no other action | `/activities/{id}/performance`, `PATCH /models/{modelId}` | 047 FR-011, SC-002 |
| `TestWaveB_PerformanceScope_046_FR044` | Priya, Mei: 404 (not 403) on the Measure plan's and the other team's activities; Alex, Carlos 200 | `/activities/{id}/performance{,/facts,/sources}` | 046 FR-044, 047 US2-6 |
| `TestWaveB_PerformanceRights_046_FR043` | Only Alex may create sources and mappings, upload, pull, list imports and review rows, recheck, change configuration, write keys and codes; GET sources 200 for all | `/performance/...`, `/activities/{id}/integration-ids/{sourceId}`, `/activities/{id}/media-codes` | 046 FR-043, contract |
| `TestWaveB_LoadReconciles_046_SC001` | Five counts add to rows read; same file again changes no figure; undo restores and lists *Undone* | `POST /performance/sources/{id}/uploads`, `/performance/imports/{id}{,/undo}`, `/reports/revenue` | 046 FR-013, FR-017, FR-022, SC-001, SC-004 |
| `TestWaveB_HeldFactsCountNowhere_046_SC002` | Fleet expo Rotterdam's row is held; report actuals unchanged; its panel gated | upload, `/reports/funnel`, `/activities/{id}/performance` | 046 FR-020, FR-027, SC-002, 049 FR-021 |
| `TestWaveB_PersonalDataRefused_046_FR012` | A personal-data column: 409 `not_allowed` naming it; no import listed | uploads, `/performance/imports` | 046 FR-012, SC-007, 046-C17 |
| `TestWaveB_ReviewQueue_046_FR023` | Unknown key and keys-disagree rows listed with reasons; dismiss without comment 422 | `/performance/review-rows{,/{rowId}/dismiss}` | 046 FR-019, FR-023, FR-024, SC-003 |
| `TestWaveB_SettingsRights_047_050` | Categories, model edit, attribution PUT: Alex 2xx, others 403; GET 200 for all; stale attribution save 409 | `/settings/activity-categories`, `/models/{modelId}`, `/settings/attribution` | 047 FR-023, 050 FR-002, US1-4 |
| `TestWaveB_ModelChangeRestates_050_SC002` | After 050 T007: a new model names itself on every ROI; facts without a journey credit the same revenue under every model | `/settings/attribution`, `/reports/revenue/ranked`, `/reports/summary/league/roi` | 050 FR-004, FR-008, FR-009, SC-002 |

## Per screen checklist

### Performance data (046) — Settings › Performance data, activity Performance and Data sources, Media codes

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| New source listed with freshness *Stale* | US1-1, FR-001, FR-005 | Alex | | |
| Mappings → template downloads with exactly those columns | US1-2, FR-008 | Alex | | |
| Second active source for one model's MQL refused, naming the first | US1-3, FR-003 | Alex | | |
| Delete only while a source holds no facts; else Deactivate with the reason | US1-4, FR-002 | Alex | | |
| Deactivated: upload refused, *Is integrated* updates at once; reactivate works | US1-5, FR-004 | Alex | | |
| Editing a mapping leaves earlier uploads unchanged | US1-6, FR-007 | Alex | | |
| Others read sources; every change refused | FR-043 | Carlos, Sara, Lea | | |
| All faults of one row reported together | US2-2, FR-011 | Alex | | API until T052 |
| Keys disagree: unmatched, both candidates named, in the queue | US2-3, FR-019 | Alex | | API |
| Held on a Submitted activity; released when Daniel approves | US2-4, FR-020 | Alex, Daniel | | |
| Five counts add to rows read; per-measure breakdown below | US2-5, FR-022 | Alex | | API |
| Same file twice changes nothing; a repeated reference replaces, both versions audited | US2-6, FR-013 | Alex | | |
| Personal-data file refused whole, column named | US2-7, FR-012 | Alex | | |
| Undo states counts first; upload stays *Undone* | US2-8, FR-017 | Alex | | |
| Simulated pull only by an explicit action, same path as an upload | FR-010, 046-C13 | Alex | | |
| Not approved: "Approve the activity to see performance data", no figures | US3-1, FR-027, FR-028 | all | | Fleet expo Rotterdam, Workshop roadshow Benelux, Dealer summit |
| Approved: per stage goal, actual, projected, conversion; revenue names its model | US3-2, FR-029 | Alex | | |
| No source for a stage: the reason, never a sample figure | US3-3, FR-032, SC-008 | Alex | | |
| Facts list: date, source, measure, value, currency, key, upload; search; export | US3-4, FR-030 | Alex; Lea no export | | |
| Stale source shows the date its data runs through | US3-5, FR-005 | Alex | | |
| Restored and re-approved: held facts released | US3-6, FR-021 | Alex | | |
| Data sources area: name, aliases, code count, *Is integrated*, *Goal entered*, per-source ID, count, last date | FR-031 | Alex | | |
| External name and old name (alias) match; alias clash refused | US4-1–3, FR-033–FR-035 | Alex | | |
| Second integration ID per source refused; removal confirms its effect, logged | US4-4, US4-5, FR-037 | Alex | | |
| A copied activity carries no keys, codes or facts | US4-6, FR-038 | Alex | | |
| Queue: find by key, source, reason, upload, date, status; correct → *Resolved*; dismiss needs a comment; reopen | US5-1–5, FR-023–FR-026 | Alex | | API until T094 |
| Media codes only where the type needs them; all missing attributes at once; copy code and tagged link; Delete only unused | US6-1–5, FR-039–FR-042 | Alex | | |
| Panel of another team's activity by address: not found, not "no access" | FR-044 | Priya, Mei | | |
| Every state: data, not approved, no source, no goal, no data yet, stale, failed | FR-032, SC-008 | Alex | | |
| Keyboard only: source form, mappings, key and code dialogs; Escape returns focus | constitution IX, 039 FR-033 | Alex | | |
| axe and dark theme, Settings page and panel | plan (VI), constitution X | Alex | | |
| Panel with 2,000 facts < 1 s; 50,000-row match < 10 s | plan *Benchmark*, SC-009 | — | | benchmark only |

### Projections (047) — activity Performance section, Settings › Models, Settings › Activity categories

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Velocity 1 and 2 saved, audited; stale save names who saved last | US1-1, FR-001, FR-003 | Alex | | |
| −1, 25 and 1.5 all reported at once | US1-2, FR-001 | Alex | | |
| Unticking a stage with a goal names the goals first; the goal stays and projects | US1-3, FR-003, FR-005 | Alex | | |
| Every stage unticked: refused | US1-4, FR-002 | Alex | | |
| Live waterfall example shows the lag | FR-004 | Alex | | |
| Projected column; months split at today; current month carries both | US2-1, US2-2, FR-010, FR-016 | Alex | | Helix search and social, second half |
| Typed later stages project their own goals | US2-3, FR-009 | Alex | | Tellus webinar series |
| No goal: projected "—" with *no goal*, never 0 | US2-4, FR-013 | Alex | | Retargeting test, Tellus case studies |
| Model name and its last change beside every projected figure | US2-5, FR-012 | Alex | | |
| Nothing after December; shifted conversions dropped | FR-008, edge cases | Alex | | velocity 2 on a late activity |
| Category CRUD: duplicate ignoring case refused; a type moves; one default; delete to bin, Undo restores assignments | US3-1–4, FR-018–FR-021 | Alex | | needs the route (T056) |
| Without `settings.manage`: categories and models read-only with the view-only notice | US3-5, FR-023 | Carlos, Priya, Lea | | |
| Each activity type shows its category on Activity types | FR-022 | Alex | | 047 T060 missing |

### Shared frame checks (039) — run on Summary, Revenue and Funnel stages

| Check | Source | Role(s) | Summary | Revenue | Funnel | Notes |
|---|---|---|---|---|---|---|
| Breadcrumb, title, "Figures as of …", Saved views, Export; no primary action | 039 FR-006 | Alex | | | | |
| "In view" equals All work's counts for the same filters | 039 FR-007, SC-001 | Alex, Priya | | | | |
| Panel changes wait for Apply; year, period, currency, Show and chips apply at once | 039 FR-013, FR-014 | Alex | | | | |
| Address keeps filters and own parameters; Back and a pasted link reproduce the page | 039 FR-015, SC-005; 048 FR-004; 049 FR-019 | Alex | | | | category, stage, sort, drill, `revenueBy`… |
| A value no longer available is left out with the count | 039 FR-015, FR-029 | Priya | | | | Measure plan's ID in Priya's address |
| Saved views: save, update, star, rename, delete with Undo; own parameters kept | 039 FR-024–FR-028, 049 US3-3 | Alex | | | | |
| Opens on current year, all plans, Months, display currency | 039 FR-030 | Alex | | | | |
| Every chart has Table with the same values and totals; ⓘ names each figure | 039 FR-020, FR-021 | Alex | | | | |
| Widget CSV/Excel; report Export with widget sheets, *In view*, *About this export* (filters in words, exporter, rates used) | 039 FR-022, `exportReport` | Alex | | | | |
| File name "SP&A One – <report> [– <widget>] – <year> – <date>" | 039 FR-022 | Alex | | | | |
| Export holds exactly what is shown: filters, category, stage, sort | 039 FR-022 | Alex | | | | open question 6 |
| No Export offered; export URL answers 403 | 039 FR-022 | Lea | | | | |
| Skeleton while loading; one failed widget says so with Try again, others stay | 039 FR-023, 048 state 10 | Alex | | | | block one request in devtools |
| "No plans you may see for 2025"; "Your filters exclude everything" with Reset | 039 FR-031 | Alex, Mei | | | | |
| Keyboard only: panel, selectors, Chart/Table, ranked drill, export; Escape and focus return | 039 FR-033, 048 SC-005 | Alex | | | | |
| Below 1024 px the panel becomes "Filters (n)" | 039 FR-033 | Alex | | | | |
| axe clean (RankedList "Open …" target size: open question 13) | 039 SC-007, 049 SC-005, 048 SC-005 | Alex, Lea | | | | |
| Dark theme: chart tokens, no yellow or red series, contrast | 039 FR-021, constitution X | Alex | | | | |
| No "Measure", "Tactic", "HUD" on screen | 039 FR-032 | Alex | | | | |
| Frame within 2 s at the 028 volume | 039 SC-003 | — | | | | benchmark |

### Summary (048)

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Period label, projected and goal as amounts, Performance %, variance word, Goal coverage per stage | US1-1, FR-005, FR-006 | Alex | | |
| Trend: actual before today, projected after, in progress, labelled Today marker, table | US1-2, FR-007 | Alex | | |
| Each allowed stage: volume against goal with word; later stages a conversion card | US1-3, FR-009, FR-010 | Alex | | |
| Conversion trend opens on MQL; choice kept in the address | US1-4, FR-011 | Alex | | |
| Category narrows every widget | US1-5, 048-C8 | Alex | | |
| No goal: "—" and **No goal**; zero denominator "—" | US1-6, 048-C1, FR-010 | Alex | | |
| Details opens Revenue / Funnel stages with the same filters, period, currency, category, stage | US1-7, FR-016 | Alex | | |
| League tables: five highest, then Total over all; ties by name; "—" last, not among five | US2-1, FR-012, edge cases | Alex | | |
| Changing one table's segment reloads that table only; kept in the address | US2-2, FR-014, 048-C6 | Alex | | one request in devtools |
| Not filled in and equal shares; Total counts each record once | US2-3, FR-013, 048-C4 | Alex | | |
| ROI "—" with the reason until configured; then model and basis named | US2-4, FR-015 | Alex | | |
| Cost and ROI "—" with plans left out; revenue, performance, volumes shown | US2-5, FR-003 | Lea | | |
| Widget export = its table, currency named, league tables every value | US3-1, FR-021 | Alex | | |
| Page export: a sheet per widget in page order; not offered without `data.export` | US3-2 | Alex, Lea | | |
| Each report state names its cause: no plans, no goals, no data, not approved (count), no model stage, no financial access, attribution not configured, filtered to nothing | report states 2–9, FR-018, SC-004 | Alex, Lea, Mei | | |
| No configurable cards, e-mail sharing or monthly FX | FR-022 | Alex | | |
| "Are we on track?" answered in under 30 s with no filter set | SC-001 | Carlos | | |
| Opens within 2 s at the 028 volume | SC-005, FR-020 | — | | benchmark |

### Revenue (049)

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Past months actual, later projected, current both; card = actual to last month + projected from today | US1-1, FR-004 | Alex | | |
| Cards: goal, actual, actual or projected, performance | FR-010, 049-C9 | Alex | | |
| Ranked by projected revenue, grouped by plan: ordered within groups, group totals, level below | US1-2, FR-005, FR-006 | Alex | | |
| Entry: name, level, owner, goal, actual, projected, performance, actual cost, ROI | FR-012 | Alex | | |
| No goal: projected "—" with the reason | US1-3, FR-009 | Alex | | Show Activity, Retargeting test |
| Actual cost and ROI "—", "Attribution is not configured yet" | US1-4, FR-013 | all | | until 050 T007 |
| One-team viewer: only their plans anywhere; left-out count stated | US1-5, FR-002 | Priya, Mei | | |
| ⓘ on the goal card explains model, rates, velocity and the comparison | FR-014 | Alex | | |
| Quarters are sums of their months; in-progress rule per quarter | FR-003, 049-C4 | Alex | | |
| Drill with trail and Back; drilled record filtered away falls back with a note | FR-005, edge cases | Alex | | |
| Name search; "Open in Plan" link | FR-005 | Alex | | |
| EUR display: one conversion at the current rate; facts without a rate excluded and counted | FR-024, 046-C7 | Alex | | 047 T058 risk |
| Empty: no goals · not approved (held) · no data loaded, each stated | FR-008, 049-C20 | Alex, Mei | | |
| Model and its last change beside projected figures | FR-022, SC-006 | Alex | | |
| Performance whole per cent with 048's words | FR-023, 049-C15 | Alex | | after `ActivitySeries` |
| Category narrows cards, series, ranked; Uncategorised; saved view keeps it | US3-1–3, FR-019, FR-020 | Alex | | needs 047 T062 |

### Funnel stages (049)

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Stage selector: allowed stages in funnel order, opens on the first; no Deals | US2-1, FR-015, 049-C12 | Alex | | |
| Entry: goal, actual, projected, performance, conversion from the previous stage | US2-2, FR-017 | Alex | | |
| Plan whose model lacks the stage: "—" and uncovered plans counted | US2-3, FR-018 | Alex | | |
| Previous stage without actual: conversion "—", never 0 % | US2-4, FR-017 | Alex | | |
| Series named from the stage; goal, actual, projected by period | FR-016 | Alex | | |
| Ranked sorts by the stage's actual and projected volume | FR-006 | Alex | | |
| Stage kept in the address, saved views and Summary's Details link | contract `stage`, 048 FR-016 | Alex | | |
| Category as on Revenue | US3, FR-019 | Alex | | |

### Attribution (050) — Settings › Attribution and ROI on Summary and Revenue

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Equally distributed designated; five models, a sentence each | US1-1, FR-001 | Alex | | |
| U-shaped: confirmation says every attributed figure is restated; logged with who and when | US1-2, FR-002 | Alex | | |
| No Save, with "Changing the attribution model needs Manage settings" | US1-3, FR-002 | Carlos, Priya, Lea | | |
| Second tab's save refused as changed meanwhile | US1-4, FR-002 | Alex | | |
| ROI "50% · U-shaped · on actual cost"; no payments "—", "No actual cost yet" | US3-1, US3-2, FR-007, FR-008 | Alex | | after T007 |
| *Use planned cost* labelled "on planned cost", kept in the address | US3-3, FR-007 | Alex | | parameter unnamed |
| After a model change no screen or export shows the old model | US4, FR-009, SC-002, SC-003 | Alex | | after T007 |
| Keyboard, axe, dark theme | 039 FR-033, constitution X | Alex | | |

## Cross-report consistency

| # | Must agree | Source |
|---|---|---|
| 1 | Summary's actual or projected, goal and performance = Revenue's cards, same filters, category, currency | 048 FR-008, SC-002 |
| 2 | Summary's stage volumes, goals and performance = Funnel stages' cards for each stage | 048 SC-002 |
| 3 | Each league table's Total = its section figure; Revenue league Total = Summary revenue | 048 SC-003 |
| 4 | Ranked top-level totals, no grouping = the series totals (Revenue and Funnel) | 049 SC-002 |
| 5 | Activity panel's actual per stage = Revenue/Funnel ranked actual at Show Activity | 049 FR-021, 047 FR-014, measure-metrics §2 |
| 6 | Activity panel's plan-year projected = ranked projected for that activity | 047 FR-010, FR-016, 049 FR-022 |
| 7 | Summary's conversion card = Funnel stages' conversion for the same stage | 048-C7, 049-C13 |
| 8 | Each category + Uncategorised = All categories, on every report | 049 FR-020, 047-C7, 048-C8 |
| 9 | Same rate in Revenue, Summary and Plan budget for one display currency; *About this export* names it | 039 FR-018, 049 FR-024, 048 FR-017 |
| 10 | Summary's Cost league Total = Plan budget's Actual (paid), same filters | 048-C5, measure-metrics §1 *Actual* |
| 11 | Credited + unattributed = revenue; facts without a journey credit the same under every model | 050 SC-001, FR-004, FR-005 |
| 12 | Performance and variance words identical on Summary and Revenue | 049-C15, 048-C1, 048-C10 |

## Measure demo data

The e2e seed (`frontend/playwright.config.ts`:32) and compose (`compose.yaml`:27) load `-measure`.

| Screen | Alex, Carlos (Lea by scope) | Priya, Daniel, Mei, Sara | Source |
|---|---|---|---|
| Plans list of Summary, Revenue, Funnel | includes FY2026 Measure demo – Lubricants Benelux | as without `-measure` | 039 FR-003; `seed/measure_test.go`:118 |
| In view | + 1 plan, 2 campaigns, 3 initiatives, 9 activities, 13 line items | unchanged | 039 FR-007; demo doc |
| Ranked list, group by plan | a Measure demo group (Helix always-on 2026, Tellus industrial 2026) | no such group | 049 FR-002 |
| Goal coverage, INQ | the plan's 12,000 against its activities' 4,000 + 4,000 + 600 + 1,500 = 10,100 → 84 % | — | 048-C2; `measure.json`:29, 66, 86, 134, 224 |
| Performance gate | Fleet expo Rotterdam (Submitted), Workshop roadshow Benelux (Declined), Dealer summit, Tellus trade press (Created) | not found | 046 FR-027, FR-044 |
| Projection kinds | typed: Helix … first half, Tellus webinar series; model: Helix … second half, Fleet expo; no goal: Retargeting test, Tellus case studies | not found | 047 FR-007, FR-009, FR-013 |
| Categories | Digital media, Event, Content production need categories | same | 049 US3; 047 T062 |

E2e literals on the wave B branches (049's e2e ran on `seed -reset`, without `-measure`: its `playwright.config.ts`:32):

| File:line | Literal | Why it matters with `-measure` |
|---|---|---|
| `frontend/e2e/measure-revenue.spec.ts`:5 | "the only demo activity with INQ, MQL and a revenue goal" | False: Helix … first half and Tellus webinar series carry typed MQL and revenue (`measure.json`:66-68, 224-226) |
| `measure-revenue.spec.ts`:39 | `$400,000.00` on the Fleet cards row | Row-scoped, safe while Fleet cards stays on page 1 under the default projected-revenue sort; two Measure campaigns now rank too |
| `measure-revenue.spec.ts`:65, 69 | `60,000`, `2,000` | Row-scoped INQ and MQL goals, safe |
| `measure-revenue.spec.ts`:72 | `FY2026 Mobility China` after Group by Plan | Safe; Alex now also gets the Measure demo group |
| `frontend/e2e/projections.spec.ts`:29-46 | saves Lubricants 1.0 with velocities 1, 2 and Revenue unticked | Mutates the shared e2e database; the Measure plan runs on Lubricants 1.0, so any later e2e asserting its projections or Summary's stages depends on run order |
| `projections.spec.ts`:25 | `250,000 INQ` | The model's worked example, not plan data: safe |

## Findings

| # | Report | Severity | Finding | State |
|---|---|---|---|---|
| | | | | |

## How to run

**API harness**: `cd backend; go test -race ./internal/measure/wavebqa/` — fakes, `apitest.New(t, apitest.WithMeasureDemo())`.

**Browser**: `docker compose up -d postgres`; `cd backend; go run ./cmd/seed -reset -measure; go run ./cmd/api`
(127.0.0.1:8080); `cd frontend; pnpm run dev` (127.0.0.1:5173). Password `mapp`. Sign in as **Alex** (every screen and
every change), **Carlos** (all markets, read-only Settings), **Priya** (one team), **Mei** (the other team), **Sara**
(viewer of both), **Lea** (no financial data, no export, all markets). Then load facts, since none are seeded: as Alex
create a source with mappings, and either upload a CSV keyed by activity ID or register the feed's integration IDs
(lower-case `<integrationId><sourceId>-campaign-00…11`, `simulatedfeed/feed.go`:86-91) on approved activities and pull
(`POST /performance/sources/{id}/pull`). End to end: `pnpm run test:e2e -- measure projections`.

## Open questions

1. **No performance facts in the demo.** 046 T110 is blocked on `seed/measure.go` (046 `tasks.md`:254), which now
   exists; the build guide gives the facts to 046 (`measure-module-build.md`:107). Every actual, conversion, held-fact
   and ROI check needs them. Lane B or lane D?
2. **No activity categories seeded** (047 `tasks.md`:112, T062, lane D): category checks of 048 and 049 need them.
3. **Lea and the Measure plan.** `demo-users-and-data.md`:94 says only Alex and Carlos see it; `seed/access.go`:56
   gives Lea All markets, and `seed/measure_test.go`:118 tests only Carlos and Priya.
4. **Revenue without `finance.view`.** 039 FR-004 (`039 spec.md`:225) hides money; 048 shows revenue (`048
   spec.md`:133); 049 is silent (`spec.md`:278) and its code applies no finance rule. Same for the 046 panel's revenue.
5. **049's actual cost after 050**: which plans it covers without `finance.view` is unstated (049 `spec.md`:247).
6. **Exports drop wave B parameters.** `shared/api.ts`:57-65 sends no `category`, `stage` or league segments, and
   `exportReport` declares neither `category` nor `stage`; asks in 049-C19 (`spec.md`:112) and 048 T019
   (`tasks.md`:56). Likely a finding like wave A's #2.
7. **046 screens missing**: upload, pull, imports, undo (`tasks.md`:121) and the review queue (`tasks.md`:214); the
   `/settings/performance-data` and `/settings/activity-categories` routes are absent from
   `frontend/src/app/settings-routes.tsx` (046 `contracts/api.md`:107, 047 `tasks.md`:100). Run those on the API.
8. **Undo's narrower rule** (`performance.import` + `settings.manage`, 046 `contracts/api.md`:45): no demo role has
   one without the other, so the harness needs a custom role.
9. **050**: no `contracts/api.md`; *Use planned cost* has no parameter name (`spec.md`:142); *Unattributed*
   (`spec.md`:141) shows nowhere while the Attribution view is deferred (`spec.md`:29); T007–T008 wait on 050-Q1
   (`tasks.md`:28-29).
10. **048 not built**; it waits for `ActivitySeries` (048 `spec.md`:70, `tasks.md`:9). Until then 049 says "No goal
    set." where 048-C1 says **No goal**.
11. **047 open items**: is a zero goal a goal (`tasks.md`:107, T059) — decides "No goal" against 0; currency mismatch
    in `SplitAmounts` (`tasks.md`:105, T058) — check Revenue in EUR.
12. **Lane D's own data**: `measure.json`:87 gives Helix search and social, second half MQL 800 without a revenue,
    but `seed/activities.go`:193 keeps typed stages only with a typed revenue, so that MQL goal is dropped. Intended?
13. **axe**: 049's e2e excludes RankedList's "Open …" links for target size (`measure-revenue.spec.ts`:15, 049
    `contracts/api.md`:62). A finding on 040 or accepted?
