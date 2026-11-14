# Measure wave A — QA pass (issue #46)

**2026-11-12 (D-425):** the `waveaqa` package is removed; its checks duplicated the owning packages' tests, and the regression tests of the fixed findings live there (`measure/revenue`, `measure/summary`, `projection`). The record below is history.

Lane C, 2026-11-02. Every built wave A report on the demo data under the demo roles, through the API test
harness (`backend/internal/measure/waveaqa`), so a role's scope, access and financial visibility are checked
without a browser. A first browser pass ran on 3 Nov 2026 (below).

The harness is `apitest.New`: the standard demo data **without** the optional Measure demo plan (seed `-measure`),
whose purchase requests and two-level approval the wave B pass covers through `apitest.WithMeasureDemo()`.

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
| 1 | 042 Purchase requests | High | A person without financial access saw **Committed** and **Invoiced** as `0.00 USD` in the cards, in the commitment charts' total and in the grid's vendor and request totals, because a plan's amounts were marked hidden only when one of its lines added to the figure. Spec FR-020 and FR-021: a dash, never a zero. | Fixed here, with `TestNoFinanceView_NothingCommitted_042_FR020_FR021` |
| 2 | 042 Purchase requests | Medium | The grid export ignored the filters, columns and descending order on screen: the shared export declared and sent only 041's parameters. | Fixed by lane A in PR #86 (merged 2 Nov); kept by `TestWaveA_PurchaseRequestExportKeepsFilters_042_FR027` |
| 3 | 041 Approvals | Medium | The grid export ignored the grid's filters. | Fixed by lane A (`29d8682f`) before this pass; kept by `TestWaveA_GridExportsKeepFilters_041_FR023` |
| 4 | 043 to 045 | — | Their exports and amounts were not read beyond access and scope: no finding, none looked for. | Left to their lane's own pass |
| 5 | 042 Purchase requests | Medium | In the browser as Lea: the status mix showed `$0.00` for the statuses with no request, where Created showed "—". | Fixed in PR #127, with the same test extended to every status |

No role sees a plan, owner or team outside its scope in any report; the word "Mobility" in Plan details for a
Lubricants planner is a Shell attribute name ("Function (Mobility)"), not a record.

## Browser pass, 3 Nov 2026

The app on the local demo database (PostgreSQL 17, seed `-measure`), in the built-in browser:

- **041 Approvals by hand (041 T041):**
  - **Alex:** 3 plans; status mix 3 waiting, 9 approved, 3 declined; 1.3 days over 16 rounds; 23 grid rows
    including PR-1004's two levels, purchase orders and declined comments.
  - **Daniel:** 1 plan, 7 steps, only his own approvals.
  - **Sara:** 2 plans; Fleet card launch's level 1 by Carlos with level 2 waiting.
  - In every view, a round counts once it is finished and each approver's steps count separately: Sara's "6 decided
    rounds" beside Carlos 1 and Daniel 6 is that rule, not a fault.
- **Lea (no financial access), every wave A report:**
  - **Approvals:** no amount at all.
  - **Plan budget:** budget and planned cost show (plan data); committed, actual, unspent and spend are "—".
  - **Plan details:** activities and planned cost.
  - **Purchase requests:** cards, charts and grid are "—", but the status mix showed `$0.00` (finding 5).
  - The financial notice shows on each report.
- **Not done:**
  - **People and reports:** the other people on the other reports, which the API tests cover above.
  - **States:** every state of every spec.
  - **Keyboard use, dark theme:** not checked.
  - **Why:** the browser pane was hidden part of the time, and a hidden pane does not render.
