# Measure wave B — browser pass (issue #47)

Lane D, 2026-11-03. **Status: prepared on `measure-module` e301b23d; not run yet.** The full run waits for 046 T110
(the Measure demo's performance facts, `feature/046-t110-demo-facts`) to merge. A smoke run of Reports › Revenue as
Alex, light, passed every check but one: no model is named beside Revenue's projected figures (049 FR-022), for the
full run to record.

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
| With facts (`MEASURE_FACTS=1`) | per check | the seeded source and load, the panel's actual and data-through date, Revenue's actual, Summary's data, the Funnel's INQ actual |

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

- 114 tests and 19 with facts. One worker: about 25 minutes on a quiet machine, 45 on a busy one (estimated from the
  smoke run's 21 to 63 s for the longest test). The pass changes no data, so `--workers 3` is safe (not tried yet).
- One screen, person and theme: add `--project light -g "Reports . Revenue . alex"`.
- Results in `BROWSER_PASS_RESULTS`: `screens/<screen>--<person>--<theme>.png`, `results.json`, and
  `report/index.html` (`node_modules/.bin/playwright show-report <folder>/report`).
- `BROWSER_PASS_DATABASE_URL`, `BROWSER_PASS_API_PORT` and `BROWSER_PASS_WEB_PORT` move the database and ports.
- Checks of the scripts: from `frontend`, `node_modules/.bin/prettier --config .prettierrc.json --check
  ../scripts/measure-wave-b-browser-pass.*.ts`; from the root, `frontend/node_modules/.bin/eslint -c
  frontend/eslint.config.js scripts/measure-wave-b-browser-pass.*.ts`.

## Results

| Screen | Role | Theme | Check | Result | Notes |
|---|---|---|---|---|---|

## Findings

| # | Screen | Severity | Finding | State |
|---|---|---|---|---|
