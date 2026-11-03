# Measure wave B — browser pass (issue #47)

Lane D, 2026-11-03. **Ran 2026-11-03 on `measure-module` 23f4336d** (T110 merged, PR #136; run on 99c15dbd, the same
content), with `MEASURE_FACTS=1`, on PostgreSQL 18 in Docker (`mapp_browser_pass`, API 18491, web 14491, `BROWSER_PASS_SLOW=3`)
while the 028 volume build loaded the machine: 154 tests in 775 s, one worker. 108 passed, 26 failed, 20 skipped (the
facts tests' dark copies). The 26 come from six checks: findings B1 and B3 of this pass and finding 15, confirmed on
screen. B2 showed on a screenshot the check let through; with the check made to want a date, its six tests were rerun
and fail on it alone. No step timed out; no slowness is recorded from this machine.

The browser rows of `measure-wave-b-qa.md` ("Roles and what they must see", "Per screen checklist", the rows left
*Not run* or *browser pass*), as a repeatable Playwright run instead of wave A's pass by hand
(`measure-wave-a-qa.md`, "Browser pass, 3 Nov 2026"): `scripts/measure-wave-b-browser-pass.spec.ts` and its modules,
with a config of its own (`scripts/measure-wave-b-browser-pass.config.ts`), outside `frontend/e2e` and CI.

## What it checks

One test per screen and person, in a light and a dark project; each check is a step, and a failed check is recorded
while the next one still runs.

| Screen | People | Checks |
|---|---|---|
| Settings › Performance data, Imports, Rows to review | Alex, Carlos, Priya, Sara, Lea | opens, axe, changes only for Alex (View only note or No access otherwise), keyboard: dialogs open with Enter, Escape closes them and returns the focus |
| Activity › Performance | all six; Priya, Mei, Sara also another team's | figures or the gate, model and last change, never 0.00, integration IDs only for Alex, another team's activity *not found*; keyboard |
| Settings › Models, Activity categories, Attribution | Alex, Carlos, Priya, Sara, Lea | opens, axe, the seeded records, changes only for Alex, the lock's reason; keyboard |
| Reports › Summary, Revenue, Funnel stages | all six | breadcrumb and "Figures as of", axe without exclusions (open question 13), plans in scope, financial notice, Export only with `data.export`, cost and ROI "—" never 0.00 without `finance.view` (revenue is served in full: open question 4), no "Measure", "Tactic", "HUD" beyond the demo's names, each report's widgets, the model beside projected figures, Show Plan in scope; keyboard: Saved views, Export, Apply, Period, selectors, a widget's Table, Group by |
| With facts (`MEASURE_FACTS=1`) | per check | the seeded source and load, the panel's actual and data-through date, Revenue's and Summary's figures on PostgreSQL, Summary's ROI league, the Funnel's INQ actual |

Keyboard checks run in the light project only; the facts checks run in light only and skip without
`MEASURE_FACTS=1`. A screenshot of every screen, person and theme is saved before the checks.

## How to run

PostgreSQL at 127.0.0.1:5432 (user `mapp`, trust), Go on the path, `frontend/node_modules` installed, ports 18110 and
14110 free. The run reloads its own database, `mapp_browser_laned` (created when missing), with `seed -reset -measure`,
builds the web app with Vite (no type check): one to four minutes before the first test.

```powershell
cd frontend
$env:BROWSER_PASS_RESULTS = '<a folder outside the repository>'
$env:MEASURE_FACTS = '1'   # once the seed loads 046 T110's facts
node_modules/.bin/playwright test --config ../scripts/measure-wave-b-browser-pass.config.ts
```

- 114 tests and 20 with facts: 13 minutes on one worker on a loaded machine (775 s, servers included). The pass changes
  no data, so `--workers 3` is safe (not tried yet); `BROWSER_PASS_SLOW=3` triples every timeout.
- One screen, person and theme: add `--project light -g "Reports . Revenue . alex"`.
- Results in `BROWSER_PASS_RESULTS`: `screens/<screen>--<person>--<theme>.png`, `results.json`, and
  `report/index.html` (`node_modules/.bin/playwright show-report <folder>/report`).
- `BROWSER_PASS_DATABASE_URL`, `BROWSER_PASS_API_PORT` and `BROWSER_PASS_WEB_PORT` move the database and ports.
- Checks of the scripts: from `frontend`, `node_modules/.bin/prettier --config .prettierrc.json --check
  ../scripts/measure-wave-b-browser-pass.*.ts`; from the root, `frontend/node_modules/.bin/eslint -c
  frontend/eslint.config.js scripts/measure-wave-b-browser-pass.*.ts`.

## Results

Both themes unless the theme says light (keyboard and facts checks). "All five" is Alex, Carlos, Priya, Sara, Lea;
"all six" adds Mei. Screenshots and the HTML report of the run are in the lane's scratchpad, not the repository.

| Screen | Role | Theme | Check | Result | Notes |
|---|---|---|---|---|---|
| Settings › Performance data | all five | both | opens; axe | Pass | |
| Settings › Performance data | Alex | both | Imports, Rows to review and New data source offered | Pass | |
| Settings › Performance data | Carlos, Priya, Sara, Lea | both | View only note; no Imports, Rows to review or New data source | Pass | 046 FR-043 |
| Settings › Performance data | all five | light | *Measure demo feed* listed with its last load and freshness | Pass | facts |
| Settings › Performance data | Alex | light | keyboard: New data source opens with Enter, Escape closes it, focus back | Pass | |
| Imports, Rows to review | Alex | both | open; axe; Upload a file and Pull simulated feed offered; *Nothing to review* | Pass | |
| Imports | Alex | light | the seeded load listed, *Completed* | Pass | facts |
| Imports, Rows to review | Alex | light | keyboard: Upload a file opens and closes; Tab reaches each search | Pass | |
| Imports, Rows to review | Carlos, Priya, Sara, Lea | both | No access with Go to Home; axe | Pass | `performance.import` |
| Activity › Performance | all six | both | opens; axe | Pass | |
| Activity › Performance | Alex, Carlos, Lea; Priya, Sara | both | INQ goal beside actual and projected; a missing actual states its reason | Pass | Tellus webinar series; Social always-on |
| Activity › Performance | Mei | both | Fleet card launch (Submitted): the gate, no figures | Pass | 046 FR-027 |
| Activity › Performance | Alex, Carlos, Lea | both | the model and the date of its last change | **Fail** | B2 |
| Activity › Performance | Alex; the others | both | Register integration ID offered; not offered | Pass | 046 FR-043 |
| Activity › Performance | Alex, Carlos, Lea | light | Helix … first half: INQ actual; *Measure demo feed* "through 09 Mar 2026" | Pass | facts; US3-5 |
| Activity › Performance | Alex, Carlos | light | Helix … first half revenue actual $62,108.70 = the ranked list at Show Activity | Pass | facts; cross-report 5 |
| Activity › Performance | Lea | both | revenue without `finance.view` | Observed | goal $120,000.00, projected $20,849.43; with facts $62,108.70 actual (open question 4) |
| Activity › Performance | all but Mei | light | keyboard: the months open with Enter; Alex's key dialog opens, Escape closes it | Pass | |
| Another team's activity | Priya, Mei, Sara | both | by address: not found, not No access; axe; keyboard reaches Go to Plans | Pass | 046 FR-044 |
| Settings › Models, Activity categories | all five | both | open; axe; Lubricants 1.0, Mobility 1.0; the seeded three categories | Pass | |
| Settings › Models, Activity categories | Alex; the others | both | New model, New category offered; View only note instead | Pass | 047 FR-023 |
| Settings › Models, Activity categories | all five | light | keyboard: a row's details open with Enter, Escape closes them, focus back | Pass | |
| Settings › Attribution | all five | both | opens; axe; five models, Equally distributed designated | Pass | 050 FR-001 |
| Settings › Attribution | Alex; the others | both | Save offered; no Save, every model locked, the reason named | Pass | the reason is the role refusal, "Changing Settings isn't part of your role (…)" |
| Settings › Attribution | Alex | light | keyboard: Tab reaches the model, an arrow chooses another, Tab reaches Save | Pass | nothing saved |
| Summary, Revenue, Funnel stages | all six | both | breadcrumb, title, "Figures as of" | Pass | 039 FR-006 |
| Summary, Revenue, Funnel stages | all six | both | axe, the ranked list's Open links included | **Fail** for Lea, light | B3; no target-size violation anywhere (open question 13) |
| Summary, Revenue, Funnel stages | all six | both | plans in scope, in the filter and *In view* | Pass | 039 FR-003 |
| Summary, Revenue, Funnel stages | Lea; the others | both | financial notice, Export disabled with the reason; neither | Pass | 039 FR-004, FR-022 |
| Summary, Revenue | Lea | both | cost and ROI "—", never 0.00 | Pass | Summary's cost league says "No cost recorded" (finding 19) |
| Summary, Revenue, Funnel stages | all six | both | no "Measure", "Tactic", "HUD" beyond the demo's names | Pass | 039 FR-032 |
| Summary, Revenue, Funnel stages | all six | both | each report's widgets; Funnel stage INQ, MQL, opens on INQ | Pass | |
| Revenue, Funnel stages | all six | both | the model beside projected figures | **Fail** | B1 |
| Revenue, Funnel stages | all six | both | Show Plan ranks only the plans in scope | Pass | 049 FR-002 |
| Summary, Revenue, Funnel stages | all six | light | keyboard: Saved views and Export menus (Enter, Escape, focus back), Apply, Period, selectors, a widget's Table, Group by | Pass | Export for the five with `data.export` |
| Revenue | Alex | light | Actual revenue $86,108.70; February $42,000.00, March $44,108.70 | Pass | facts |
| Revenue | Alex | light | Show Activity: Helix … first half actual $62,108.70, ROI "Attribution is not configured yet." | Pass | facts |
| Revenue | all six | light | actual revenue an amount with the Measure plan, its reason without | Pass | facts |
| Summary | Alex | light | no state; actual or projected = Revenue's $216,549.97; MQL conversion 16.0 %, Above plan; trend February, March as Revenue | Pass | facts; cross-report 1 |
| Summary | Carlos, Lea | light | no "No performance data" state | Pass | facts |
| Summary | Alex | light | ROI league "—" while attribution is not configured | **Fail** | finding 15: External 36 %, Total 36 %, "Equally distributed, on actual cost"; fixed by #139 in the API, the screen not rerun |
| Funnel stages | Alex | light | the INQ actual card is a figure | Pass | facts |

Not run: 050's crediting (Helix 54,000.00, Tellus case studies 13,405.80, Tellus webinar series 18,702.90 under Equally
distributed): no screen or endpoint serves `attribution.Crediting` (finding 15). Not in this pass: Daniel; changes
(uploads, undo, mappings, review actions, model and category edits, saved-view edits, attribution save), drill, Sort
by (#97), below 1024 px, loading and failed widgets, EUR display.

### Checklist rows (`measure-wave-b-qa.md`) this run settles

| Section | Row | Browser |
|---|---|---|
| Performance data | Others read sources; every change refused | Pass |
| Performance data | Not approved: "Approve the activity to see performance data" | Pass |
| Performance data | Approved: per stage goal, actual, projected, conversion; revenue names its model | Fail: the model's date (B2) |
| Performance data | Stale source shows the date its data runs through | Pass for the date ("through 09 Mar 2026"); the seeded source is *Current*, so *Stale* not seen |
| Performance data | Panel of another team's activity by address: not found | Pass |
| Performance data | Keyboard only (source form, key dialog) | Pass; mappings and code dialogs not run |
| Performance data | axe and dark theme, Settings page and panel | Pass |
| Projections | Model name and its last change beside every projected figure | Fail (B2) |
| Projections | Without `settings.manage`: read-only with the view-only notice | Pass |
| Shared frame | Breadcrumb, title, "Figures as of", Saved views, Export | Pass (three reports) |
| Shared frame | No Export offered (Lea) | Pass: disabled with the reason |
| Shared frame | Keyboard only | Pass (panel, selectors, Table, menus); ranked drill not run |
| Shared frame | axe clean (open question 13) | Fail for Lea, light (B3); the Open links pass |
| Shared frame | Dark theme | Pass (axe) |
| Shared frame | No "Measure", "Tactic", "HUD" | Pass |
| Summary | Cost and ROI "—" with plans left out; revenue, performance, volumes shown | Pass |
| Summary | ROI "—" with the reason until configured | Fail (finding 15); fixed by #139 in the API, the screen not rerun |
| Revenue | Cards: goal, actual, actual or projected, performance | Pass |
| Revenue | One-team viewer: only their plans | Pass |
| Revenue | Actual cost and ROI "—", "Attribution is not configured yet" | Pass |
| Revenue, Funnel stages | Model and its last change beside projected figures | Fail (B1) |
| Funnel stages | Stage selector: allowed stages, opens on the first | Pass |
| Attribution | Equally distributed designated; five models | Pass |
| Attribution | No Save without Manage settings, with the reason | Pass; the words are the role refusal, not the checklist's |
| Attribution | Keyboard, axe, dark theme | Pass |
| Cross-report | 1 (Summary = Revenue) and 5 (panel actual = ranked actual) | Pass |

## Findings

| # | Screen | Severity | Finding | State |
|---|---|---|---|---|
| B1 | 049 Revenue, Funnel stages | Medium | No model is named beside projected figures. Any of the six, either theme, `/reports/revenue?year=2026` or `/reports/funnel?year=2026`: no "Projected from …" or model name anywhere on the page, though the API serves `projection` (model name, `modelChangedAt`) on both reports. Expected: the model and its last change beside the figure (049 FR-022, SC-006; 047 FR-012); `RevenueCards.tsx` and `FunnelCards.tsx` read no `projection`. Finding 13 is the API's half (one model named for two plans). | Open, #140 |
| B2 | 047 activity Performance | Medium | The model's last change is not a date. Alex, Carlos or Lea, an activity with a projection (Tellus webinar series): "Projected from Lubricants 1.0, last changed 03T14:40:44.211Z Nov 2026." Expected "… last changed 03 Nov 2026." in the person's date format (047 FR-012). `PerformancePanel.tsx`:149 gives `date()` the timestamp `modelChangedAt`; Settings › Attribution passes `localDate(…)` first. 047's e2e checks only the start of the line. | Open, #140 |
| B3 | 039 frame (Summary, Revenue, Funnel stages) | Medium | The financial notice fails text contrast. Lea, light theme, any of the three reports: axe `color-contrast` on "You can't see the financial data of these plans" (`._note_…`). `.note` (`ReportFrame.module.css`:113-118) is `--ink-2` #757575 on `--page-bg` #f5f5f5, about 4.2:1 against WCAG 1.4.3's 4.5:1 for small text; `tokens.css`:2 says text on grey uses `--ink`. The same rule styles the left-out note, "Changes not applied yet" and `.muted`. Dark theme passes. Constitution X, 039 SC-007. | Open, #140 |
| 15 | 048 Summary | Medium | Confirmed on screen with T110's facts: Alex's Summary ROI league shows External 36 %, Total 36 %, "Equally distributed, on actual cost", while Revenue's ranked list says "Attribution is not configured yet." for the same activities. | Fixed by #139 (048-C15): on PostgreSQL with T110's facts every ROI value and the total are null with "Attribution is not configured yet" and no model is named; `TestWaveB_SummaryRoiIsADashUntilCrediting_048_FR015` asserts it on the demo fakes. The screen is not rerun |
