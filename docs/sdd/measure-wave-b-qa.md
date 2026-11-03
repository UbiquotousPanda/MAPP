# Measure wave B — QA pass (issue #47)

Lane D. **Status: Checklist prepared 2026-11-02 before the features merge; nothing run yet.**

**046 part ran 2026-11-02 against `measure-module` 27a1fa84** (PR #62 merged): eight API checks in
`backend/internal/measure/wavebqa`, all green on the demo fakes, three low findings and one checklist correction
(Findings). 047 reached `measure-module` meanwhile (887311c8); the same eight pass there unchanged.

**047 part ran 2026-11-02 against `measure-module` 9c1ce8b6** (PR #75, T062 merged): six API checks in the same
package (`projection_test.go`, `restated_test.go`, `categories_test.go`), all green on the demo fakes, two low findings
and one medium (Findings 5–7). No `TestWaveB_CategoriesSeeded_047_T062`: `seed/measure_categories_test.go` proves it
through the same API on the same harness; `TestWaveB_CategoryRecords_047_FR018_FR022` adds the activity types' view.

**049 part ran 2026-11-03 against `measure-module` 3df7cc7d** (#82, `ActivitySeries` #99, the reason enum #104 and the
export's own parameters #105 merged; **#97, the web's Sort by (FR-006), still open**, so the Sort by checks wait):
thirteen API checks in the same package (`report*_test.go`), all green on the demo fakes, one medium and six low
findings (Findings 8–14). Summary (#106 open) and ROI with attribution (050 T007–T008) are not run. On the fakes the
reports never see an uploaded fact (How to run): every report figure here is goal and projection, and the report half
of `TestWaveB_HeldFactsCountNowhere_046_SC002` and cross-report checks 5 and 6 need PostgreSQL.

The same pass as wave A (#46, PR #87 `qa/wave-a-pass`: `docs/sdd/measure-wave-a-qa.md`,
`backend/internal/measure/waveaqa/qa_test.go`), now for Performance data, Projections, Summary, Revenue, Funnel stages
and Attribution: every screen on the demo data **with the Measure demo plan** under the demo roles (every scope, no
financial access), findings raised as issues on the owning feature, critical and high fixed before wave B merges.

## Merge prerequisites

| Section | Must be on `measure-module` first | State 2026-11-02 |
|---|---|---|
| Performance data (046) | PR #62; integrator's `/settings/performance-data` web route (046 `contracts/api.md`:107) and the approvals call to 046's release port (note 2) | Open. Upload, imports, undo and review queue have no web yet (046 T052, T094) |
| Projections (047) | PR #75 (stacked on #62); `/settings/activity-categories` web route (047 T056); category seed (047 T062, lane D) | Merged: #75 887311c8, T062 a23f382a; the route is in `settings-routes.tsx`:32, the T056 e2e still open |
| Revenue, Funnel stages (049) | PR #82 (stacked on #75, retargeted); lane B's `ActivitySeries` follow-up with 048-C1's words (048-C10) | Merged: #82 c6ca9913, `ActivitySeries` #99 4c1f93e0, #104, #105 (3df7cc7d); #97 (Sort by) open |
| Summary (048) | 048 built (T001–T023 all open, no PR) after #82 and `ActivitySeries` | #106 open (2026-11-03) |
| Attribution (050) | T001–T006 are on `measure-module` (Settings › Attribution, `RoiValue`); T007–T008 need #62 | Figures on 048/049 blocked (050-Q1) |
| Any actual figure | Performance facts in the demo (046 T110; build guide §4.7) | None seeded: load them by hand (How to run) |
| Automated checks | PR #87 (waveaqa, its helpers) | Open |

## Roles and what they must see

| Person | Role | Plans (2026, `-measure`) | Reports offered | Cost, ROI | Export | Performance data | Models, categories, attribution |
|---|---|---|---|---|---|---|---|
| Alex Morgan | Administrator, all markets | Lubricants, Mobility, **Measure demo** | all nine, User access too | yes | yes | change, keys, undo | change |
| Carlos Mendes | Global planner, all markets | Lubricants, Mobility, **Measure demo** | eight | yes | yes | read | read only |
| Priya Raman, Daniel Okoro | Planner (Daniel also Approver), my teams | Lubricants Europe (Daniel also the Measure activities he approves, finding 4) | eight | yes | yes | read | read only |
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
| `TestWaveB_ScopePerRole_FR003` | Each role's frame names only the plans above; ranked lists at `show=plan` name no other plan. 049: green, children and `show=activity` too; Daniel's reports reach Lubricants Europe alone (finding 4 is the activity read); the Measure plan's ID in Priya's address is dropped and counted (`leftOut` 1). Summary waits for 048 | `/reports/frame?report={summary,revenue,funnel}`, `/reports/{revenue,funnel}/ranked` | 039 FR-003, 049 FR-002, SC-004, 048 FR-003 |
| `TestWaveB_CatalogueMatchesAccess_FR001` | Summary, Revenue, Funnel stages listed and available; each opens 200 for all seven. 049: green, the two ranked lists too; Summary is listed, not available, until #106 | `/reports`, `/reports/{summary,revenue,funnel}?year=2026` | 039 FR-001, FR-003 |
| `TestWaveB_NoFinancialAccess_Summary_048_FR003` | Lea: cost and ROI league rows and totals null, `financeCovers` 0 of >0; revenue league and funnel not null | `/reports/summary`, `/reports/summary/league/{cost,roi,revenue}` | 048 FR-003, US2-5 |
| `TestWaveB_NoFinancialAccess_Revenue_039_FR004` | Lea: ranked `actualCost` null; revenue cards' rule to confirm (open question 4). Green: both frames say finance 0 of 3, every `actualCost` and `roi` null at every level; revenue is served to her in full, not asserted (open question 4) | `/reports/revenue`, `/reports/revenue/ranked` | 039 FR-004, 049 FR-013 |
| `TestWaveB_ExportRights_FR022` | Alex 200, Lea 403 on every wave B export; the 046 part runs now (facts export: Alex's file holds Helix's five facts). 049's is `TestWaveB_ExportRights_049_FR022`: the six with `data.export` 200, Lea 403, workbook and widget CSV; sheets Cards, Periods, Ranked list, In view, About this export; named "SP&A One – Revenue – 2026 – 12 Mar 2026.xlsx", "… – Ranked list – ….csv". Summary waits for 048 | `/reports/{summary,revenue,funnel}/export`, `/activities/{id}/performance/facts/export` | 039 FR-022, 048 FR-003, 046 contract |
| `TestWaveB_ExportsKeepOwnParams_FR022` | `category`, `stage=mql`, `revenueBy`, `sort=actualRevenue` each give 200 and a file different from the default. Green for Digital, `stage=mql`, `stage=mql` with Uncategorised, `sort=actualRevenue`, `sort=actual` (the API's sort; #97 is the web's menu): each file holds the report's own figure or first row. *About this export* names none of them (finding 14). `revenueBy` waits for 048 | `/reports/{revenue,funnel}/export?widget=ranked`, `/reports/summary/export?widget=leagueRevenue` | 039 FR-022, 049 FR-019, 048 FR-004, FR-021 (open question 6) |
| `TestWaveB_SummaryEqualsRevenueAndFunnel_048_SC002` | Same filters and category: Summary revenue = Revenue cards; Summary stages = Funnel cards per `stage` | `/reports/summary`, `/reports/revenue`, `/reports/funnel?stage=` | 048 FR-008, SC-002, 048-C3 |
| `TestWaveB_RankedTotalsEqualSeries_049_SC002` | Ungrouped top-level totals equal the series totals, both reports. Green: Revenue, INQ, MQL at all four Show levels, actual or projected and actual against the series, goal against the goal card; plan groups add to their entries. The series' goal against the card: finding 10, kept out | `/reports/{revenue,funnel}{,/ranked}` | 049 SC-002 |
| `TestWaveB_LeagueTotalEqualsSection_048_SC003` | Revenue league Total = Summary revenue for every segment offered | `/reports/summary/league/revenue?segment=` | 048 SC-003, 048-C4 |
| `TestWaveB_CategoriesLoseNothing_049_FR020` | Sum over each category + `uncategorised` = all categories, on all three reports. Green on Revenue and Funnel stages (INQ, MQL): cards and every month; each activity in exactly one, Fleet card launch (MOBILITY – Long-term contract) Uncategorised. Summary waits for 048 | `?category=` | 049 FR-019, FR-020, 048-C8 (needs 047 T062) |
| `TestWaveB_MissingIsNeverZero_FR009` | Without facts: actual null with a reason, conversion null, no 0 where a figure is missing. Green for what holds: the Revenue list's actual null, the no-goal activities null in both lists, conversion null (`noPreviousStage`), 2025 `noData`; the cards', months' and Funnel list's actual 0: finding 8, kept out | the three reports, `/activities/{id}/performance` | 049 FR-008, FR-009, 048 FR-017, 047 FR-013 |
| `TestWaveB_RoiNotConfigured_049_FR013` | Every `actualCost`, `roi` null with "Attribution is not configured yet" until 050 T007; then model and basis. The base (050 T001–T006): green, null with `attributionNotConfigured` at every level, ungrouped, by plan, by owner, and "—" in the export, though `/settings/attribution` answers Equally distributed. A category's empty records have no reason: finding 11 | `/reports/revenue/ranked`, `/reports/summary/league/roi` | 049 FR-013, 048 FR-015, 050 FR-008 |
| `TestWaveB_SeriesSplitAtToday_049_FR003_FR004` | Twelve months split at 12 March (January–February actual, nothing projected; March in progress; April on projected only), the actual or projected card = the series; four quarters, Q1 in progress, each its months' sum, the cards unchanged. Green, Revenue and both stages | `/reports/{revenue,funnel}?period=` | 049 FR-003, FR-004, 049-C4 |
| `TestWaveB_FunnelStageSelector_049_FR015` | `availableStages` INQ, MQL; opens on INQ, `stage=mql` shows MQL; no plan uncovered (both demo models allow both). Green | `/reports/funnel?stage=` | 049 FR-015, FR-018, 049-C11, 049-C12 |
| `TestWaveB_ProjectionNamesItsModel_049_FR022` | Mobility China names Mobility 1.0, the Measure plan Lubricants 1.0, each with the model's `updatedAt`; Alex's velocity save an hour later moves both reports' stamp. Green; a view of both models names one (finding 13) | `/reports/{revenue,funnel}`, `/models/{modelId}` | 049 FR-022, SC-006, 047 FR-012 |
| `TestWaveB_ViewsKeepOwnParams_049_FR019` | A Revenue view keeps `category`, `group`, `sort`; a Funnel view `category=uncategorised`, `sort`, `stage=mql`; both listed as saved. Green | `/reports/{revenue,funnel}/views` | 049 FR-019, 049-C10, US3-3 |
| `TestWaveB_ProjectionShape_047_FR008_FR010` | Helix … first half (with `loadFacts`), second half, Tellus webinar series: twelve months of 2026, none negative, January–February actual only, April on projected only, March both; `projected` = actual to February + projected from March (3,458 = 700 + 2,758 on Helix … first half INQ); stamp Lubricants 1.0 with the model's `updatedAt`; goal stages the model allows. Retargeting test, Tellus case studies `noGoal`, no months, no stamp; Fleet expo gated. Months without a source say 0 (finding 6), kept out | `/activities/{id}/performance`, `/models/{modelId}` | 047 FR-008, FR-010, FR-012, FR-013, SC-005 |
| `TestWaveB_ProjectionsRestated_047_SC002` | Two reads, and one an hour later the same day, byte for byte the same; Alex's velocity 1 and 2 shifts Helix … second half's MQL one month and revenue three, drops what lands after December and moves the stamp; Helix … first half (typed) unmoved | `/activities/{id}/performance`, `PATCH /models/{modelId}` | 047 FR-008, FR-009, FR-011, FR-012, SC-002 |
| `TestWaveB_StagesProjectTheirGoals_047_FR007_FR009` | Tellus webinar series' months add to its typed 1,500 INQ, 300 MQL, 120,000.00 USD; Helix … second half's INQ months to 4,000, each MQL month 2 % of its INQ, half-up. Revenue against the goal: finding 7, not asserted | `/activities/{id}/performance` | 047 FR-006, FR-007, FR-009, SC-003 |
| `TestWaveB_ModelProjectionFields_047_FR001_FR003` | −1, 25 and no stage in one 400 naming all three; velocity 1 and 2 saved at version 2, one log entry, a stale save 409 naming Alex; unticking INQ names the plans first (contract check skipped: finding 5), saved, the plan keeps its INQ goal and Helix … second half projects | `PATCH /models/{modelId}`, `/models/{modelId}/impact`, `/activity-log`, `/plans/{planId}` | 047 FR-001–FR-003, FR-005, US1-1–4 |
| `TestWaveB_CategoryRecords_047_FR018_FR022` | The seeded three, Digital the default, MOBILITY – Long-term contract in none, as the list and every activity type say; "dIGITAL" refused; a type moves with the default; the bin releases it, Undo brings both back | `/settings/activity-categories`, `/activity-types`, `/recycle-bin/{entryId}/undo` | 047 FR-018–FR-022, US3-1–4, T062 |
| `TestWaveB_PerformanceScope_046_FR044` | Priya, Daniel, Mei, Sara: 404 with a missing activity's very body (not 403) on the Measure plan's and the other team's activities, export included; Daniel sees the Measure activities he approves (finding 4); Alex, Carlos, Lea 200 | `/activities/{id}/performance{,/facts,/facts/export,/sources}`, `/integration-ids`, `/external-name-aliases`, `/media-codes` | 046 FR-044, 047 US2-6 |
| `TestWaveB_PerformanceRights_046_FR043` | Every change answers 403 to the six demo roles but Alex, who can make each in turn (delete of a source with facts 409, upload to a deactivated one 409); sources, mappings, template, configuration 200 for all seven | `/performance/...`, `/activities/{id}/integration-ids/{sourceId}`, `/activities/{id}/media-codes`, `/media-codes/{id}` | 046 FR-002, FR-004, FR-043, contract |
| `TestWaveB_UndoNeedsSettingsManage_046_FR043` | Mei with a custom role (`plans.view`, `performance.import`) loads and reads her load; undo of hers or Alex's 403, integration ID 403 | uploads, `/performance/imports/{id}{,/undo}`, `/roles`, `/people/{id}/roles` | 046 FR-043, 046-C16, open question 8 |
| `TestWaveB_LoadReconciles_046_SC001` | One row in each of the five outcomes, adding to rows read, again under INQ and in the stored summary; same file again changes no figure; a repeated reference replaces; each undo restores the figure before it and the loads stay listed *Undone* | `POST /performance/sources/{id}/uploads`, `/performance/imports/{id}{,/undo}`, `/activities/{id}/performance` (`/reports/revenue` after 049) | 046 FR-013, FR-017, FR-022, SC-001, SC-004 |
| `TestWaveB_HeldFactsCountNowhere_046_SC002` | Fleet expo (Submitted), Workshop roadshow (Declined), Dealer summit (Created) rows held, listed as held, their panels gated with no figure; Helix's actual only its own; Daniel's approval releases Fleet expo's. The report half needs PostgreSQL: on the fakes no report reads an uploaded fact (How to run) | upload, `/activities/{id}/performance{,/facts}`, `/activities/{id}/approval/approve`; `/reports/funnel` after 049 | 046 FR-020, FR-027, FR-028, SC-002, 049 FR-021 |
| `TestWaveB_PersonalDataRefused_046_FR012` | `E-mail` and `Phone` columns: 409 `not_allowed` naming both; no import, no row to review, no figure | uploads, `/performance/imports`, `/performance/review-rows` | 046 FR-012, SC-007, 046-C17 |
| `TestWaveB_ReviewQueue_046_FR023` | Unknown key, keys disagree (both candidates named) and a two-fault row listed with reasons; findable by reason, key, source, status, date; no POST; dismiss without comment refused (contract 422, served 400: finding 1); dismiss, reopen, correct → *Resolved* and counted; Mei with `performance.import` sees no candidate (046-C15) | `/performance/review-rows{,/{rowId}{,/dismiss,/reopen,/correct}}` | 046 FR-011, FR-019, FR-023, FR-024, SC-003 |
| `TestWaveB_SettingsRights_047_050` | Category create, edit, delete, model edit and impact, attribution PUT: Alex 2xx in turn, the six others 403; categories, models, attribution and activity types 200 for all seven; stale attribution save 409. 050's PUT is on 9c1ce8b6, so its half runs too | `/settings/activity-categories{,/{categoryId}}`, `/models{,/{modelId}{,/impact}}`, `/settings/attribution`, `/activity-types` | 047 FR-023, 050 FR-002, US1-4 |
| `TestWaveB_ModelChangeRestates_050_SC002` | After 050 T007: a new model names itself on every ROI; facts without a journey credit the same revenue under every model | `/settings/attribution`, `/reports/revenue/ranked`, `/reports/summary/league/roi` | 050 FR-004, FR-008, FR-009, SC-002 |

## Per screen checklist

### Performance data (046) — Settings › Performance data, activity Performance and Data sources, Media codes

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| New source listed with freshness *Stale* | US1-1, FR-001, FR-005 | Alex | | |
| Mappings → template downloads with exactly those columns | US1-2, FR-008 | Alex | | |
| Second active source for one model's MQL refused, naming the first | US1-3, FR-003 | Alex | | |
| Delete only while a source holds no facts; else Deactivate with the reason | US1-4, FR-002 | Alex | Pass (API) | Empty source 204; one with facts 409 `in_use` naming Deactivate (`PerformanceRights`). Save's answer: finding 3 |
| Deactivated: upload refused, *Is integrated* updates at once; reactivate works | US1-5, FR-004 | Alex | Pass (API) | Upload 409 while inactive, reactivate 200; *Is integrated* not read |
| Editing a mapping leaves earlier uploads unchanged | US1-6, FR-007 | Alex | | |
| Others read sources; every change refused | FR-043 | Carlos, Sara, Lea | Pass (API) | All six non-administrators: 29 changes and gated reads (imports, review rows) 403, five Settings reads 200; undo also needs `settings.manage` (custom role) |
| All faults of one row reported together | US2-2, FR-011 | Alex | Pass (API) | Future date and negative count on one row, both faults listed |
| Keys disagree: unmatched, both candidates named, in the queue | US2-3, FR-019 | Alex | Pass (API) | Activity ID against an integration ID of the other Helix activity |
| Held on a Submitted activity; released when Daniel approves | US2-4, FR-020 | Alex, Daniel | Pass (API) | Fleet expo's 100 INQ shows once Daniel approves |
| Five counts add to rows read; per-measure breakdown below | US2-5, FR-022 | Alex | Pass (API) | One row per outcome; INQ breakdown and stored summary equal |
| Same file twice changes nothing; a repeated reference replaces, both versions audited | US2-6, FR-013 | Alex | Pass (API, figures) | 710 → 710 → 760; the audit of both versions not read |
| Personal-data file refused whole, column named | US2-7, FR-012 | Alex | Pass (API) | Both columns named; no import, row or figure |
| Undo states counts first; upload stays *Undone* | US2-8, FR-017 | Alex | Pass (API) | Each undo restores the figure before its load; the confirmation is web (T052) |
| Simulated pull only by an explicit action, same path as an upload | FR-010, 046-C13 | Alex | Fail (low) | Pull 201 for Alex, 403 for others; without mappings 500 where an upload answers 400 (finding 2) |
| Not approved: "Approve the activity to see performance data", no figures | US3-1, FR-027, FR-028 | all | Pass (API) | Fleet expo Rotterdam, Workshop roadshow Benelux, Dealer summit: `notApproved`, no stage, no revenue; wording is web |
| Approved: per stage goal, actual, projected, conversion; revenue names its model | US3-2, FR-029 | Alex | | |
| No source for a stage: the reason, never a sample figure | US3-3, FR-032, SC-008 | Alex | | |
| Facts list: date, source, measure, value, currency, key, upload; search; export | US3-4, FR-030 | Alex; Lea no export | Pass (export) | Alex's CSV has the columns and Helix's five facts; Lea 403. Search not run |
| Stale source shows the date its data runs through | US3-5, FR-005 | Alex | Not run | The fakes never derive the last load or data-through date (`performancetest` `ListSources`); PostgreSQL does (`store_postgres.go`:89): browser pass |
| Restored and re-approved: held facts released | US3-6, FR-021 | Alex | | |
| Data sources area: name, aliases, code count, *Is integrated*, *Goal entered*, per-source ID, count, last date | FR-031 | Alex | | |
| External name and old name (alias) match; alias clash refused | US4-1–3, FR-033–FR-035 | Alex | | |
| Second integration ID per source refused; removal confirms its effect, logged | US4-4, US4-5, FR-037 | Alex | | |
| A copied activity carries no keys, codes or facts | US4-6, FR-038 | Alex | | |
| Queue: find by key, source, reason, upload, date, status; correct → *Resolved*; dismiss needs a comment; reopen | US5-1–5, FR-023–FR-026 | Alex | Pass (API) | API until T094. Dismiss without a comment is 400, not the contract's 422 (finding 1); with `performance.import` alone Mei sees the rows, no candidate |
| Media codes only where the type needs them; all missing attributes at once; copy code and tagged link; Delete only unused | US6-1–5, FR-039–FR-042 | Alex | | |
| Panel of another team's activity by address: not found, not "no access" | FR-044 | Priya, Mei | Pass (API) | Also Daniel, Sara; same body as a missing activity on six reads and the export. Daniel sees what he approves (finding 4) |
| Every state: data, not approved, no source, no goal, no data yet, stale, failed | FR-032, SC-008 | Alex | | |
| Keyboard only: source form, mappings, key and code dialogs; Escape returns focus | constitution IX, 039 FR-033 | Alex | | |
| axe and dark theme, Settings page and panel | plan (VI), constitution X | Alex | | |
| Panel with 2,000 facts < 1 s; 50,000-row match < 10 s | plan *Benchmark*, SC-009 | — | | benchmark only |

### Projections (047) — activity Performance section, Settings › Models, Settings › Activity categories

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Velocity 1 and 2 saved, audited; stale save names who saved last | US1-1, FR-001, FR-003 | Alex | Pass (API) | Version 2, one log entry ("1 month", "2 months"); a version-1 save 409 `version_conflict` naming Alex Morgan |
| −1, 25 and 1.5 all reported at once | US1-2, FR-001 | Alex | Pass (API, −1 and 25) | One 400 names both velocities and the empty stage set. 1.5 is no contract value (integer): `bad_request` before validation; the form's field takes no decimals (`ModelForm.tsx`:232), browser pass |
| Unticking a stage with a goal names the goals first; the goal stays and projects | US1-3, FR-003, FR-005 | Alex | Pass (API) | Unticking INQ names 3 plans; saved, the Measure plan keeps INQ 12,000 and Helix … second half still projects 4,000. The warning's `kind` breaks the contract (finding 5). No demo plan sets its goal at MQL |
| Every stage unticked: refused | US1-4, FR-002 | Alex | Pass (API) | In the same 400 |
| Live waterfall example shows the lag | FR-004 | Alex | | web; 047's e2e (T055) |
| Projected column; months split at today; current month carries both | US2-1, US2-2, FR-010, FR-016 | Alex | Pass (API) | 12 Mar: January, February actual only, March both and in progress, April on projected only, every stage and revenue; Helix … first half INQ 700 + 2,758 = 3,458. Months without a source say 0 (finding 6). The column is web |
| Typed later stages project their own goals | US2-3, FR-009 | Alex | Pass (API) | Tellus webinar series' months: 1,500 INQ, 300 MQL, 120,000.00 USD; velocity 1 and 2 leave Helix … first half as it was |
| No goal: projected "—" with *no goal*, never 0 | US2-4, FR-013 | Alex | Pass (API) | Retargeting test, Tellus case studies: `projected` null, `projectedReason` `noGoal`, no months, no stamp; the "—" is web |
| Model name and its last change beside every projected figure | US2-5, FR-012 | Alex | Pass (API) | `projection`: Lubricants 1.0 and the model's `updatedAt`, moving with Alex's save; one stamp per panel |
| Nothing after December; shifted conversions dropped | FR-008, edge cases | Alex | Pass (API) | Velocity 1 and 2: Helix … second half MQL 78 → 65 (December's 13 dropped), revenue 60,000 → 30,000; twelve months to 2026-12. The 60,000 against a 40,000 goal: finding 7 |
| Category CRUD: duplicate ignoring case refused; a type moves; one default; delete to bin, Undo restores assignments | US3-1–4, FR-018–FR-021 | Alex | Pass (API) | "dIGITAL" 400 on `name`; Promotion with Event takes Event and the default; in the bin, Event is uncategorised and no default is left; Undo restores both. The route exists now: browser pass |
| Without `settings.manage`: categories and models read-only with the view-only notice | US3-5, FR-023 | Carlos, Priya, Lea | Pass (API) | All six non-administrators: category create, edit, delete, model edit and impact 403, Settings reads 200. The notice is web |
| Each activity type shows its category on Activity types | FR-022 | Alex | Pass (API) | `/activity-types` names each type's category as the list groups it, after every change; the page is 047 T060, still open |

### Shared frame checks (039) — run on Summary, Revenue and Funnel stages

| Check | Source | Role(s) | Summary | Revenue | Funnel | Notes |
|---|---|---|---|---|---|---|
| Breadcrumb, title, "Figures as of …", Saved views, Export; no primary action | 039 FR-006 | Alex | | | | |
| "In view" equals All work's counts for the same filters | 039 FR-007, SC-001 | Alex, Priya | | | | |
| Panel changes wait for Apply; year, period, currency, Show and chips apply at once | 039 FR-013, FR-014 | Alex | | | | |
| Address keeps filters and own parameters; Back and a pasted link reproduce the page | 039 FR-015, SC-005; 048 FR-004; 049 FR-019 | Alex | | Pass (API, views) | Pass (API, views) | category, stage, sort, drill, `revenueBy`…; a saved view keeps category, stage, sort, group (`ViewsKeepOwnParams`); Back and a pasted link are web |
| A value no longer available is left out with the count | 039 FR-015, FR-029 | Priya | | Pass (API) | Pass (API) | Measure plan's ID in Priya's address: dropped from the filter, `leftOut` 1, her ranked list names Lubricants Europe alone |
| Saved views: save, update, star, rename, delete with Undo; own parameters kept | 039 FR-024–FR-028, 049 US3-3 | Alex | | Pass (API, save) | Pass (API, save) | Saved and listed with their own parameters; update, star, rename, delete with Undo not run |
| Opens on current year, all plans, Months, display currency | 039 FR-030 | Alex | | | | |
| Every chart has Table with the same values and totals; ⓘ names each figure | 039 FR-020, FR-021 | Alex | | | | Web; the Revenue series' goal adds to 4,130,000.00 against the 4,120,000.00 card (finding 10) |
| Widget CSV/Excel; report Export with widget sheets, *In view*, *About this export* (filters in words, exporter, rates used) | 039 FR-022, `exportReport` | Alex | | Pass (API) | Pass (API) | Sheets Cards, Periods, Ranked list, In view, About this export (asserted); a widget CSV opens with the notes, exporter and rates (seen); own parameters in words: finding 14 |
| File name "SP&A One – <report> [– <widget>] – <year> – <date>" | 039 FR-022 | Alex | | Pass (API) | Pass (API) | "SP&A One – Revenue – 2026 – 12 Mar 2026.xlsx", "SP&A One – Funnel stages – Ranked list – 2026 – 12 Mar 2026.csv" |
| Export holds exactly what is shown: filters, category, stage, sort | 039 FR-022 | Alex | | Fail (low) | Fail (low) | Open question 6: the rows follow category, stage and sort (#105); *About this export* says "Filters: None" (finding 14) |
| No Export offered; export URL answers 403 | 039 FR-022 | Lea | | Pass (API) | Pass (API) | Lea 403 on the workbook and a widget CSV; no Export offered is web |
| Skeleton while loading; one failed widget says so with Try again, others stay | 039 FR-023, 048 state 10 | Alex | | | | block one request in devtools |
| "No plans you may see for 2025"; "Your filters exclude everything" with Reset | 039 FR-031 | Alex, Mei | | Fail (medium) | Fail (medium) | 2025 answers `reason: noData`, but its actual and projected cards and every month say 0 (finding 8); the words are web |
| Keyboard only: panel, selectors, Chart/Table, ranked drill, export; Escape and focus return | 039 FR-033, 048 SC-005 | Alex | | | | |
| Below 1024 px the panel becomes "Filters (n)" | 039 FR-033 | Alex | | | | |
| axe clean (RankedList "Open …" target size: open question 13) | 039 SC-007, 049 SC-005, 048 SC-005 | Alex, Lea | | | | Browser; open question 13 |
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
| Past months actual, later projected, current both; card = actual to last month + projected from today | US1-1, FR-004 | Alex | Pass (API) | 12 Mar: January, February actual with nothing projected, March in progress, April on projected only; the actual or projected card is the series' (`SeriesSplitAtToday`). The actuals say 0 with no fact (finding 8) |
| Cards: goal, actual, actual or projected, performance | FR-010, 049-C9 | Alex | Fail (medium) | Goal 4,120,000.00, actual or projected 3,860,169.50 USD, performance 94; actual "0.00" with no fact loaded, never "—" (finding 8) |
| Ranked by projected revenue, grouped by plan: ordered within groups, group totals, level below | US1-2, FR-005, FR-006 | Alex | Pass (API, totals) | Plan groups' totals are their entries' and each entry lists the level below (`RankedTotals`); the order is a Sort by check: after #97 |
| Entry: name, level, owner, goal, actual, projected, performance, actual cost, ROI | FR-012 | Alex | Fail (low) | No owner on any entry, in the contract, the web or the export (finding 12) |
| No goal: projected "—" with the reason | US1-3, FR-009 | Alex | Pass (API) | Show Activity, Retargeting test and Tellus case studies: goal, projected, performance null; the entry has no reason field, so the words are web |
| Actual cost and ROI "—", "Attribution is not configured yet" | US1-4, FR-013 | all | Pass (API) | Until 050 T007. Alex at every level and grouping, and Lea: null with `attributionNotConfigured`, "—" in the export; a category's empty records carry no reason (finding 11) |
| One-team viewer: only their plans anywhere; left-out count stated | US1-5, FR-002 | Priya, Mei | Pass (API) | Also Daniel, Sara: frame, ranked lists and children name only their plans; the Measure plan's ID left out and counted |
| ⓘ on the goal card explains model, rates, velocity and the comparison | FR-014 | Alex | | |
| Quarters are sums of their months; in-progress rule per quarter | FR-003, 049-C4 | Alex | Pass (API) | Q1 in progress, Q2–Q4 planned, each its months' sum; the cards as in months |
| Drill with trail and Back; drilled record filtered away falls back with a note | FR-005, edge cases | Alex | | |
| Name search; "Open in Plan" link | FR-005 | Alex | | |
| EUR display: one conversion at the current rate; facts without a rate excluded and counted | FR-024, 046-C7 | Alex | | 047 T058 risk; facts reach the reports on PostgreSQL only (How to run) |
| Empty: no goals · not approved (held) · no data loaded, each stated | FR-008, 049-C20 | Alex, Mei | Fail (medium) | Nothing in view (2025) says `noData`, with zeros; only Submitted activities in view say nothing (finding 9); no fact loaded is never stated, actual says 0 (finding 8) |
| Model and its last change beside projected figures | FR-022, SC-006 | Alex | Fail (low) | One plan: its own model and last change, moving with Alex's save (`ProjectionNamesItsModel`); all three plans: Lubricants 1.0 alone (finding 13) |
| Performance whole per cent with 048's words | FR-023, 049-C15 | Alex | | Served whole (94 for Alex), not asserted; the word waits for a contract change (049-C21) |
| Category narrows cards, series, ranked; Uncategorised; saved view keeps it | US3-1–3, FR-019, FR-020 | Alex | Fail (low) | Cards, months and activities add up with Uncategorised, each activity once; a saved view keeps it; the ranked list keeps records with nothing in the category (finding 11) |

### Funnel stages (049)

| Check | Source | Role(s) | Pass/fail | Notes |
|---|---|---|---|---|
| Stage selector: allowed stages in funnel order, opens on the first; no Deals | US2-1, FR-015, 049-C12 | Alex | Pass (API) | INQ, MQL; opens on INQ (`FunnelStageSelector`) |
| Entry: goal, actual, projected, performance, conversion from the previous stage | US2-2, FR-017 | Alex | Pass (API) | Every field, as the contract has them; actual 0 where nothing is loaded (finding 8) |
| Plan whose model lacks the stage: "—" and uncovered plans counted | US2-3, FR-018 | Alex | Not run | Both demo models allow INQ and MQL: `uncoveredCount` 0 |
| Previous stage without actual: conversion "—", never 0 % | US2-4, FR-017 | Alex | Pass (API) | No INQ actual: the conversion card null with `noPreviousStage`, every entry's conversion null |
| Series named from the stage; goal, actual, projected by period | FR-016 | Alex | Pass (API) | `stage` answered; the export says "MQL goal", "MQL actual or projected"; split as Revenue |
| Ranked sorts by the stage's actual and projected volume | FR-006 | Alex | | Sort by: after #97; the API's `sort=actual` reaches the export (`ExportsKeepOwnParams`) |
| Stage kept in the address, saved views and Summary's Details link | contract `stage`, 048 FR-016 | Alex | Pass (API) | A saved view and the export keep `stage=mql`; Summary's link waits for 048 |
| Category as on Revenue | US3, FR-019 | Alex | Fail (low) | As Revenue (finding 11) |

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

049 part, on the fakes: 4 and 8 hold for Revenue and Funnel stages (`RankedTotalsEqualSeries`, `CategoriesLoseNothing`;
the series' goal: finding 10); 5 and 6 need PostgreSQL (How to run), and 6 can hold for approved activities only
(finding 9).

## Measure demo data

The e2e seed (`frontend/playwright.config.ts`:32) and compose (`compose.yaml`:27) load `-measure`.

| Screen | Alex, Carlos (Lea by scope) | Priya, Daniel, Mei, Sara | Source |
|---|---|---|---|
| Plans list of Summary, Revenue, Funnel | includes FY2026 Measure demo – Lubricants Benelux | as without `-measure` | 039 FR-003; `seed/measure_test.go`:118 |
| In view | + 1 plan, 2 campaigns, 3 initiatives, 9 activities, 13 line items | unchanged | 039 FR-007; demo doc |
| Ranked list, group by plan | a Measure demo group (Helix always-on 2026, Tellus industrial 2026) | no such group | 049 FR-002 |
| Goal coverage, INQ | the plan's 12,000 against its activities' 4,000 + 4,000 + 600 + 1,500 = 10,100 → 84 % | — | 048-C2; `measure.json`:29, 66, 86, 134, 224 |
| Performance gate | Fleet expo Rotterdam (Submitted), Workshop roadshow Benelux (Declined), Dealer summit, Tellus trade press (Created) | not found; Daniel sees those he approves (finding 4) | 046 FR-027, FR-044 |
| Projection kinds | typed: Helix … first half, Tellus webinar series; model: Helix … second half, Fleet expo; no goal: Retargeting test, Tellus case studies | not found | 047 FR-007, FR-009, FR-013 |
| Categories | Digital (default): Digital media; Events and sponsorship: Event, Sponsorship; Content and creative: Content production, Agency fees – Creative; MOBILITY – Long-term contract in none | same | 049 US3; 047 T062 (`measure.json`:269-273) |

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
| 1 | 046 Performance data | Low | `POST /performance/review-rows/{rowId}/dismiss` with `{"comment": ""}` answers **400** `validation_failed` (`comment`: "Say why this row is being dismissed.") and the row stays open; 046 `contracts/api.md`:58 and this checklist say **422**. `openapi.yaml` (`dismissReviewRow`) declares 400, so the code and the served contract agree and the feature contract is the odd one out. | Open, #100: correct `contracts/api.md`:58 (or move code and `openapi.yaml` to 422). `TestWaveB_ReviewQueue_046_FR023` asserts the refusal, not the status |
| 2 | 046 Performance data | Low | `POST /performance/sources/{id}/pull` on a simulated source with no mappings answers **500** `internal_error` ("read the feed of PS-1002: performance: the file can't be read as UTF-8 CSV", `pull.go`:26-28), where an upload of an unreadable file answers 400 `validation_failed` "This file can't be read…". FR-010 (the same path as an upload) and 046-C17 (a file refused before any row is read is refused with its reason). Nothing is stored. | Open, #100; kept out of the committed tests |
| 3 | 046 Performance data | Low | `PATCH /performance/sources/{id}` answers `factCount: 0`, `lastLoadedAt: null`, `dataThrough: null` and the freshness of a source that never loaded, for a source holding 10 facts; `GET` answers 10. `handler.go`:172 builds the answer from the bare source. Contract `PerformanceSource.factCount`: "it may not be deleted while above zero", so a client keeping the save's answer offers Delete (FR-002) until it reloads. | Open, #100; kept out of the committed tests |
| 4 | Checklist | — | Daniel sees the Measure activities he approves: the activity and its Performance answer 200 (`authz` `SeesActivity` counts approvers); Dealer summit, with no round, is not found for him. 046 follows the activity read (FR-044); this checklist's Roles table and *Performance gate* row said not found. | Corrected here; `TestWaveB_PerformanceScope_046_FR044` checks both |
| 5 | 047 Projections | Low | `POST /models/MOD-1001/impact` with `{"allowedGoalStages": ["mql", "revenue"], "version": 1}` answers 200 `{"warnings": [{"kind": "goalStageRemoved", "message": "3 plans set their goal at a stage this model would no longer allow. …", "count": 3}]}`; `openapi.yaml`:14848 (`ImpactWarning.kind`) has no `goalStageRemoved`, so the answer breaks the served contract (apitest: "value must be one of 'goalsRecalculated', …") and the web's generated types lack the kind. 047 `contracts/api.md`:12-13 adds the stranded goals to the impact answer (FR-003). | Open, #102; `TestWaveB_ModelProjectionFields_047_FR001_FR003` skips that answer's contract check |
| 6 | 047 Projections | Low | `GET /activities/{id}/performance` on an approved activity with a goal and no source (Helix … second half, as seeded): each stage `actual: null`, `reason: noSource`, yet `months` January–March carry `actual: 0` and revenue `"0.00"` USD. `measure-metrics.md`:7 ("never 0"), 047 `spec.md`:211 ("no facts at all: actual months are empty"), FR-013. No screen draws these months yet (the panel shows only web metrics' months); a chart of them would show zeros. | Open, #102; kept out of the committed tests |
| 7 | 047 Projections | Medium | Per-month rounding of deals over-projects revenue. Helix … second half: 4,000 INQ July–December, Lubricants 1.0 at 2 %, 5 %, 10,000 USD, velocity 0, no facts. Its revenue goal is 40,000 USD (80 MQL, 4 deals, `settings.Waterfall`), but the panel's `revenue.projected` is 60,000.00 USD: each month's 13 MQL × 5 % = 0.65 deals rounds up to 1, six times. 049's `GET /reports/revenue/ranked?year=2026&show=activity` shows it at performance 150 with no data loaded. FR-007 and 047-C4 (`spec.md`:37-43, 234-236) round half-up per month, and SC-003 (`spec.md`:305-308) allows "less than one unit per month"; here one unit is 10,000 USD. A rule for 047 to decide (e.g. carry the remainder, as FR-006's phasing does) before 048 and 049 show it. | Open, #102 (rule decision): 047-C4, FR-007; not asserted either way |
| 8 | 049 Revenue, Funnel stages | Medium | A missing actual is served as 0. With no fact loaded, `GET /reports/revenue?year=2026` answers `cards.actual` `{"value": {"amount": "0.00", "currency": "USD"}, "reason": ""}` and January–March `actual` "0.00"; `GET /reports/funnel?year=2026` `cards.actual.value` 0, months 0, and `actual: 0` on every entry of `/reports/funnel/ranked` with a goal, where `/reports/revenue/ranked` answers `actual: null` for the same activities. `?year=2025` (no plan in view) answers `reason: noData` with actual and projected cards "0.00" and twelve months of actual 0: the grid of zeros FR-008 forbids. 049 FR-009 (`spec.md`:250), the edge case "actual is empty … with the reason stated" (`spec.md`:217), `contracts/api.md`:31 ("never a zero"). `cards.go`:12 and `cards_funnel.go`:8 serve actual once the year has begun, `funnel_figures.go`:34 for every covered activity, `periods.go`:84 by month position. | Open, #110; kept out of `TestWaveB_MissingIsNeverZero_FR009` |
| 9 | 049 Revenue, Funnel stages | Low | `reason: notApproved` is never served (`ReasonNotApproved`, `model.go`:16, is unused). `GET /reports/revenue?year=2026&activityStatus=submitted` (Fleet card launch, Trade magazine ads, Fleet expo Rotterdam, gated on their panels) answers `reason: ""`, actual "0.00", actual or projected 590,000.00 USD; Funnel stages the same. 049-C20 (`spec.md`:118-121) and the edge case (`spec.md`:219-220): the report says the activities are not approved, their facts held. The reports also count the goals and projections of activities whose panel is gated: Launch film (Created) is 2,500,000.00 of Alex's 3,860,169.50 USD while its panel says `notApproved` with no figure, so cross-report check 6 holds for approved activities only. 049 does not say which (FR-022 against 046 FR-027). | Open, #110; not asserted |
| 10 | 049 Revenue, Funnel stages | Low | The series' goal does not add up to the goal card or the ranked total (SC-002, `spec.md`:307). Alex, `GET /reports/revenue?year=2026`: the months' `goal` add to 4,130,000.00 USD, `cards.goal` and the top entries to 4,120,000.00 (the Measure plan 640,000.00 against 620,000.00, Helix … second half's 60,000 against its 40,000, finding 7; Lubricants Europe 3,090,000.00 against 3,100,000.00); Funnel stages MQL 9,393 against 9,392, INQ agrees (380,100). 047's month-by-month rounding (finding 7) shows through 049-C21's month goal, so a Table of the series totals differently from its card (039 FR-020). | Open, #110, with 7; `TestWaveB_RankedTotalsEqualSeries_049_SC002` checks goal against the card |
| 11 | 049 Revenue, Funnel stages | Low | A category leaves records with nothing in it in the ranked list. `GET /reports/revenue/ranked?year=2026&show=campaign&category=CAT-1001` (Digital): `total` 5, Rimula fleet and Tellus industrial 2026 (no Digital activity) listed with every figure null and `actualCostReason`, `roiReason` "", besides the three that `activityType=AT-1003` (Digital media) lists; the export's Ranked list the same. US3-1 ("only activities whose type belongs to it are counted in … the ranked list"), FR-019 ("narrows every part"), `contracts/api.md`:38 (always the reason). `indexInView` (`ranked.go`:49) narrows the activities, not the records above them. | Open, #110; `TestWaveB_RoiNotConfigured_049_FR013` runs without a category |
| 12 | 049 Revenue | Low | No owner on a ranked entry. FR-012 (`spec.md`:258) lists owner among an entry's figures; `RevenueEntry` (`openapi.yaml`, `additionalProperties: false`) has id, level, name, planId, figures and children, and neither the web's columns (`RevenueReport.tsx`:34) nor the export's Ranked list has one. Owner is a grouping only. | Open, #110 |
| 13 | 049 Revenue, Funnel stages | Low | A view of plans on two models names one. Alex, `GET /reports/revenue?year=2026`: `projection` names Lubricants 1.0 alone, though Mobility China (400,000.00 USD of it) projects through Mobility 1.0, and ranked entries carry no stamp. `contracts/api.md`:42 ("every projected figure is served with the model's name and `modelChangedAt`"), SC-006; `report_revenue.go`:51 says "the ranked list's own entries carry the rest", but `RevenueEntry` has no such field. One plan names its own model (`TestWaveB_ProjectionNamesItsModel_049_FR022`). | Open, #110; not asserted |
| 14 | 039 export, 049 | Low | *About this export* says nothing of 049's own parameters. `GET /reports/revenue/export?year=2026&widget=ranked&format=csv&category=CAT-1001`: the rows are Digital's, the notes say `Filters,None` and nothing of the category; the same for `stage=mql` (only the cards' labels say "MQL") and `sort=actualRevenue`. 039 FR-022 (filters in words) and this checklist's "Export holds exactly what is shown". Revenue and Funnel stages implement no `measure.Described` (only User access does, `useraccess/sheets.go`:107). | Open, #110; open question 6's other half |

## How to run

**API harness**: `cd backend; go test -race ./internal/measure/wavebqa/` — fakes, `apitest.New(t, apitest.WithMeasureDemo())`.
On the fakes 049's reports read their own store (`storestest.go`:72, `revenuetest.NewStore()`), which nothing fills;
#99 (`ActivitySeries`) did not change that. After `loadFacts`, Helix … first half's panel says 700 INQ and the Funnel
list 0. So every report figure on the fakes is goal and projection, and cross-report checks 5 and 6 and the report half
of `TestWaveB_HeldFactsCountNowhere_046_SC002` need PostgreSQL. No API harness runs on it (`revenue/store_postgres_test.go`
tests the query alone, on `dbtest`): run them in the browser pass below after loading facts, or give `apitest` a
PostgreSQL option.

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
   Resolved by T062 (a23f382a): three categories, MOBILITY – Long-term contract left out (Measure demo data).
3. **Lea and the Measure plan.** `demo-users-and-data.md`:94 says only Alex and Carlos see it; `seed/access.go`:56
   gives Lea All markets, and `seed/measure_test.go`:118 tests only Carlos and Priya.
4. **Revenue without `finance.view`.** 039 FR-004 (`039 spec.md`:225) hides money; 048 shows revenue (`048
   spec.md`:133); 049 is silent (`spec.md`:278) and its code applies no finance rule. Same for the 046 panel's revenue.
   Still open after the 049 part: Lea's frames say finance 0 of 3, yet Revenue serves her every revenue amount, as
   Alex's (4,120,000.00 goal); `actualCost` and `roi` are null with `attributionNotConfigured`, not a finance reason.
   `TestWaveB_NoFinancialAccess_Revenue_039_FR004` asserts only the coverage and the null cost and ROI.
5. **049's actual cost after 050**: which plans it covers without `finance.view` is unstated (049 `spec.md`:247).
6. **Exports drop wave B parameters.** `shared/api.ts`:57-65 sends no `category`, `stage` or league segments, and
   `exportReport` declares neither `category` nor `stage`; asks in 049-C19 (`spec.md`:112) and 048 T019
   (`tasks.md`:56). Likely a finding like wave A's #2. Resolved by #105 (3df7cc7d) for the figures: `exportReport`
   declares `category`, `stage` and Summary's segments, `shared/api.ts` forwards them, and the files follow category,
   stage and sort (`TestWaveB_ExportsKeepOwnParams_FR022`). *About this export* names none of them: finding 14.
7. **046 screens missing**: upload, pull, imports, undo (`tasks.md`:121) and the review queue (`tasks.md`:214); the
   `/settings/performance-data` and `/settings/activity-categories` routes are absent from
   `frontend/src/app/settings-routes.tsx` (046 `contracts/api.md`:107, 047 `tasks.md`:100). Run those on the API.
8. **Undo's narrower rule** (`performance.import` + `settings.manage`, 046 `contracts/api.md`:45): no demo role has
   one without the other, so the harness needs a custom role. Done: `TestWaveB_UndoNeedsSettingsManage_046_FR043`
   gives Mei one through the access API.
9. **050**: no `contracts/api.md`; *Use planned cost* has no parameter name (`spec.md`:142); *Unattributed*
   (`spec.md`:141) shows nowhere while the Attribution view is deferred (`spec.md`:29); T007–T008 wait on 050-Q1
   (`tasks.md`:28-29).
10. **048 not built**; it waits for `ActivitySeries` (048 `spec.md`:70, `tasks.md`:9). Until then 049 says "No goal
    set." where 048-C1 says **No goal**.
11. **047 open items**: is a zero goal a goal (`tasks.md`:107, T059) — decides "No goal" against 0; currency mismatch
    in `SplitAmounts` (`tasks.md`:105, T058) — check Revenue in EUR. Both still open on 9c1ce8b6; the 047 part could
    not reach them: no demo activity has a zero goal or a revenue goal in another currency than USD.
12. **Lane D's own data**: `measure.json`:87 gives Helix search and social, second half MQL 800 without a revenue,
    but `seed/activities.go`:193 keeps typed stages only with a typed revenue, so that MQL goal is dropped. Intended?
13. **axe**: 049's e2e excludes RankedList's "Open …" links for target size (`measure-revenue.spec.ts`:15, 049
    `contracts/api.md`:62). A finding on 040 or accepted? Still open: `.open` has had a 24 × 24 px minimum since
    78e87178 (`RankedList.module.css`:102-108), and the exclusion stays on 3df7cc7d; whether axe still fails needs that
    e2e without it (browser pass).

## Lane D's own pass of 043–045 (wave A QA finding 4)

**Ran 2026-11-03 against `measure-module` c7bba407** (branch `qa/043-045-own-pass`): wave A left the exports and
amounts of Plan details, GSAP link and User access to lane D (`measure-wave-a-qa.md`, finding 4). Seventeen API checks,
`TestOwnPass_*` in `backend/internal/measure/{plandetails,gsaplink,useraccess}/ownpass_test.go`, on the demo fakes **with
the Measure demo plan**, every file read back with `platform/sheet`'s CSV and XLSX readers; all green, what failed was
kept out (L1–L6); L1 and L3–L5 are now fixed here, each with the assertion that keeps it. No demo person sees a plan
without its financial data beside one with it, and Lea, the one without `finance.view`, has no `data.export`: those
cases take a second role given through the access API (Priya: Planner and a reader of All markets; Mei: a reader of All
markets with `data.export`, no `finance.view`, or for 045 `access.manage` alone).

| Check | Source | Result |
|---|---|---|
| 043 workbook at all four levels (EUR, quarters): one sheet per widget in screen order, each its table view, then In view and About this export; each measure's first widget and the start periods as CSV the same | FR-017, US3-5, SC-005 | Green. CSV of every widget not run: 100 files, 17 s; they share `Sheets` with the workbook |
| 043 a planned-cost widget whose records count once adds to its total and the card, to the cent, every level, EUR | FR-011, FR-017, SC-002 | Green |
| 043 without `finance.view`: Lea's answer is Carlos's byte for byte at every level, every planned-cost value set; Mei's workbook is Carlos's | FR-004, US1-17, D-237 | Green: planned cost follows View plans, so nothing is dashed |
| 044 each tab's CSV in a sort of its own (`lineItem`, `vendor`, `-poAmount`, EUR) = every row and the totals; bands add to Waiting; workbook sheets = the widget files, then In view, About this export | FR-007, FR-019, US4-1, US4-2, SC-005 | Green |
| 044 without `finance.view`: Lea's amounts and Amount waiting null, 0 of 3 plans, no purchase order, the SWBS tab Carlos's; Mei's waiting file leaves the amount empty and lists no PO | FR-004, D-386, US1-11, US2-6, US3-6, US4-3 | Green; the orders file's totals L3, fixed here |
| 044 finance in one of three plans (Priya): covers 1 of 3, the Measure demo's request "—"; orders = Carlos's Lubricants Europe rows, the file the same | FR-004, US2-6, US3-6 | Green |
| 044 orders in EUR against the line item's Financials | SC-003, FR-014 | L4, fixed here: every row = its PO's Financials in EUR, the totals = the rows (`TestOwnPass_OrdersInEuros_EqualFinancials_SC003`) |
| 045 people and band files (`q=planner&status=all&sort=-lastSignedIn`) = the table, Never empty; bands add to People; workbook sheets = the files; Mei (`access.manage` alone) sees Alex's answer | FR-007, FR-013, US1-13, US2-1, SC-005 | Green; with a team L1, fixed here (`TestOwnPass_ExportKeepsTeam_US2_1`). Workbook sheets: L2 |
| Export rights: Lea 403 on the workbook and every widget of every level (043), tab (044) and widget (045); Mei with `access.manage` alone 403 on 045's exports, the report 200 | 039 FR-022, 045 US2-3 | Green |
| About this export names the report's own parameters | 039 FR-022 | 043 plans, period, currency green; level L6. 044 tab and sort L5, fixed here. 045 search and status green (`TestExport_SaysOwnFilters_US2`), team under Filters (L1), sort not named (US2-2 asks only the three) |

**Findings** (L1, L3–L5 fixed here in lane D's packages; L2 and L6 open on 039's shared export):

- **L1 — 045, High.** The export ignores the Team filter and says it applied it. `GET /reports/user-access?status=all&team=T-1001` lists 3 people (Daniel, Priya, Sara); `GET /reports/user-access/export?format=csv&widget=people&status=all&team=T-1001` lists all 7 under `Filters,Team: Lubricants Europe`, and its bands count 7; the workbook too. The web sends `team` so (`shared/report-address.ts`:154). US2-1, FR-013, SC-005. `team` is a frame filter (`measure/filter.go`:24, :106), so it never reaches `f.Own`, the only input of `useraccess/sheets.go`:28; `Describe` never names a team either. An access review filed from it lists people outside the team. **Fixed here**: `useraccess/sheets.go`:29, :49-57 (`withTeams`) reads the teams from the frame filter when the own parameters have none, as the screen reads `team`; the notes keep `Filters,Team: Lubricants Europe`. Kept by `TestOwnPass_ExportKeepsTeam_US2_1` (both files and the People sheet = the table of 3).
- **L2 — 045, Low.** The workbook holds an In view sheet of plan counts (Plans 3, Campaigns 5, …) and both files name Year, Period Months, Currency USD and four rates, controls the page does not have. US2-2 (People, Last sign-in, then About this export), FR-001, 045-C1. `measure/export.go`:132 and `export_notes.go`:15-21 add them for every report. **Open — 039's shared export (integrator).**
- **L3 — 044, Medium.** Without `finance.view`, the Purchase orders file ends `Total,…,0.00,0.00,0.00` (Mei, `…/gsap-link/export?year=2026&format=csv&widget=orders`, and the workbook's sheet), where the screen shows "You can't see financial data" and no figure; `GET /reports/gsap-link?tab=orders` serves `totals` 0.00 too, which the contract cannot make null. 039 FR-004 ("—", never 0), 044 US3-6, US4-3. `gsaplink/sheets.go`:155-157 writes the totals row whatever the coverage (`orders.go`:69). No demo role reaches it: Lea cannot export. **Fixed here** for the files: `gsaplink/sheets.go`:72, :177-196 leave the totals' amounts empty cells when no plan in view has `finance.view`, as a hidden amount is. The JSON `totals` stay 0.00: `GsapOrderTotals` is required, not nullable, in `openapi.yaml` (integrator); the web shows "You can't see financial data" instead. Kept by `TestOwnPass_ExportWithoutFinanceView_US4_3` (the file and the workbook sheet end `Total` with no figure).
- **L4 — 044, Low.** Invoiced in EUR is a cent off Financials. Carlos, `GET /reports/gsap-link?year=2026&tab=orders&currency=EUR`: L-1012, SIM-4500001001 invoiced 20,000.01 EUR; its Financials in EUR, two invoices of 10,000.00, 20,000.00; totals 80,500.01. SC-003 ("to the cent"), FR-014. `gsaplink/orders.go`:52 rounds each transaction to USD (`usdOf`) and :65 converts the sum back once; in USD it holds (`TestOrders_EqualLineItemFinancials_SC003`). **Fixed here**: `gsaplink/year.go`:94-108 (`inReport`, 039's `money.Display` with the rates, as `planbudget` and `lineitem`) converts each transaction once from its own currency to the report's, so one already in it keeps its cents, and `orders.go`:43-70 adds rows and totals in the report currency; USD unchanged. Kept by `TestOwnPass_OrdersInEuros_EqualFinancials_SC003` (`orders_contract_test.go`: every row = its PO's Financials in EUR, the totals = the rows; it is there for the 300-line limit, beside its USD twin).
- **L5 — 044, Low.** About this export does not say the tab or sort. `…/gsap-link/export?year=2026&format=csv&widget=waiting&tab=waiting&sort=vendor`: rows by vendor, notes Report to Exported at and the rates only. 039 FR-022; gsaplink is `Parameterised` (`sheets.go`:28) but not `Described`, as finding 14 for 049. 044 `contracts/api.md` ("Export sheets") still says each tab's default sort. **Fixed here**: `gsaplink/sheets.go`:80-105 implement `measure.Described`, `Tab: Waiting for GSAP` and `Sort: Vendor, ascending` in the screen's headings; the contract line now says the address's tab keeps its sort, the others their default. Kept by `TestOwnPass_ExportEqualsScreen_FR019_SC005` (each tab's and the default's words).
- **L6 — 043, Low.** About this export does not say the level. `…/plan-details/export?year=2026&show=campaign&format=csv&widget=progressCount` names Period and Currency, not Show; only the heading "Campaigns" tells. 043 FR-001 (the level lives in the address with the filters), 039 FR-022; `export_notes.go`:15-21 has no Show line and plandetails no `Describe`. **Open — 039's shared export (integrator).** Not fixable in plandetails: `Describe` gets only `f.Own`, and `show` is a frame control (`filter.go`:106), so a report never sees the level there. It needs a Show line in `export_notes.go` `notes` beside Period (it would serve Plan budget too), or `Describe` given the filter.

Not checked: the browser (export buttons, "—", "You can't see financial data"), PostgreSQL (fakes only), `-race`.
