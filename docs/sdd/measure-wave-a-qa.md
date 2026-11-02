# Measure wave A — QA pass (issue #46)

Lane C, 2026-11-02. Every built wave A report on the demo data under the demo roles, through the API test
harness (`backend/internal/measure/waveaqa`), so a role's scope, access and financial visibility are checked
without a browser. The browser pass below is still to run.

## Roles and what they must see

| Person | Role | Plans (2026) | Reports offered | Financial data | Export |
|---|---|---|---|---|---|
| Alex Morgan | Administrator, all markets | both | all six, User access too | yes | yes |
| Carlos Mendes | Global planner, all markets | both | five | yes | yes |
| Priya Raman, Daniel Okoro | Planner, my teams | Lubricants Europe | five | yes | yes |
| Mei Lin | Planner, my teams | Mobility China | five | yes | yes |
| Sara Novak | Viewer, my teams | both | five | yes | yes |
| Lea Santos | Requisitioner, all markets | both | five | **none** | **no** |

Checked by `TestWaveA_*`: each role's frame names only its own plans (`ScopePerRole`), every report the catalogue
offers opens and User access answers 403 to everyone but access.manage (`CatalogueMatchesAccess`), the role without
financial access gets dashes and zero covered plans in Approvals and Purchase requests (`NoFinancialAccess`),
exports answer 403 without `data.export` (`ExportRights`), and the Approvals and Purchase requests grid exports keep
the filters and columns on screen (`GridExportsKeepFilters`, `PurchaseRequestExportKeepsFilters`).

## Findings

| # | Report | Severity | Finding | State |
|---|---|---|---|---|
| 1 | 042 Purchase requests | High | A person without financial access saw **Committed** and **Invoiced** as `0.00 USD` in the cards and in the commitment charts' total, because a plan's amounts were marked hidden only when one of its lines added to the figure. Spec FR-020 and FR-021: a dash, never a zero. | Fixed here, with `TestNoFinanceView_NothingCommitted_042_FR020_FR021` |
| 2 | 042 Purchase requests | Medium | The grid export ignored the filters, columns and descending order on screen: the shared export declared and sent only 041's parameters. | Fixed here: `vendor`, `requestOwner`, `status` and `columns` on the export operation and in `downloadReport`, and `order` sent whichever way it points |
| 3 | 041 Approvals | Medium | The grid export ignored the grid's filters. | Fixed by lane A (`29d8682f`) before this pass; kept by `TestWaveA_GridExportsKeepFilters_FR023` |
| 4 | 043 to 045 | — | Their exports and amounts were not read beyond access and scope: no finding, none looked for. | Left to their lane's own pass |

No role sees a plan, owner or team outside its scope in any report; the word "Mobility" in Plan details for a
Lubricants planner is a Shell attribute name ("Function (Mobility)"), not a record.

## Still to do in a browser

Needs the app running on PostgreSQL (a connection string for `TEST_DATABASE_URL` and `E2E_DATABASE_URL`): each report
as Alex, Priya, Sara and Lea on the demo data for every state its spec lists (data, no plans, nothing yet, no financial
access, filters exclude everything, failure), keyboard-only use of filters, selectors, grids and exports, dark theme,
and the "as of" line. The e2e suites of 041 and 042 already run in CI against a real database.
