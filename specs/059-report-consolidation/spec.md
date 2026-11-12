# Feature Specification: Fewer Reports, Each a Distinct View

**Feature Branch**: `059-report-consolidation`

**Created**: 2026-11-12

**Status**: Approved by the product owner (12 Nov 2026)

**Input**: Product owner, 2026-11-12: "The current Measure module has lots of reports with lots of data
overlapping. Find all overlapping data and consolidate them into fewer reports, each having a distinct data
view — currently 9, maybe 4/5/6. Merge related data as well if it suits." The nine reports today are Plan budget
(040), Approval performance (041), Purchase requests (042), Plan details (043), GSAP link (044), User access
(045), Summary (048), Revenue (049) and Funnel stages (049).

## Why

| Today | Overlaps with | How |
|---|---|---|
| Summary | Revenue, Funnel stages | Its revenue section must equal Revenue's (048 FR-008); its funnel and conversion repeat Funnel stages; its league tables are a ranked list grouped by a Shell attribute |
| Revenue, Funnel stages | each other | Same series, cards, period table and ranked list (049); revenue is the funnel's last stage in money |
| Purchase requests, GSAP link | each other | Both follow a purchase request to its purchase order; both show invoiced per line (measure-metrics "Invoiced per PR line": 042, 044) |
| Plan details, User access | — | Distinct data, one audience (administrators) |

## Clarifications

- **059-C1** — Q: How many reports? → A: **Five** (approved 2026-11-12): Performance, Budget and spend, Purchasing, Approvals,
  Plan data and access. The four-report option (Purchasing folded into Budget and spend) makes one very long page.
- **059-C2** — Q: New figures? → A: **None.** Every figure keeps its definition in `docs/product/measure-metrics.md`
  and comes from today's endpoints; a merged page composes today's widgets. Only addresses, the catalogue,
  saved-view keys and the frame change. Where two widgets show the same series, one is kept (see the map).
- **059-C3** — Q: Funnel stages? → A: The stage picker offers what 049's API allows today: **Revenue · MQL ·
  INQ** (`FunnelReport.availableStages`). Deals is neither a stage nor a figure in the overview strip (no fact
  records deals; product owner, 2026-11-13, D-426); deals stay in the deals panel.
- **059-C4** — Q: Who sees Plan data and access? → A: Each tab keeps its report's permission: Data completeness
  needs `reports.view` (043), People needs `access.manage` (045, `access/routes_measure.go`). Everyone with
  `reports.view` sees the report with Data completeness; only administrators also see People.

## Where everything goes (no figure is lost)

| New report (address) | Section / tab | Comes from (today) | Notes |
|---|---|---|---|
| **Performance** `/reports/performance` | Overview strip | Summary: Actual or projected, Revenue goal, Performance, Goals planned in activities; stage figures per stage; conversion cards | Always shown, above the stage picker |
| | Stage picker | Revenue (049) · Funnel stages' stage choice | `stage=revenue\|mql\|inq`, default revenue |
| | Cards | Revenue cards / Funnel cards for the chosen stage | Overview strip already shows the year's totals; the cards keep Actual and Conversion where the strip lacks them |
| | By month / quarter | Revenue by month · Volume by month · **Summary's Revenue trend (same series, removed)** | With D-414's Total row and goal-after-December note |
| | Conversion trend | Summary's conversion trend | Shown for MQL and INQ |
| | Ranked list | Revenue / Funnel ranked list | **Group by** gains the Shell attributes Summary's league tables use; sorting by revenue, performance, cost or ROI replaces the four league tables (048 FR-012) |
| | Deals panel | 058 on Revenue | Revenue stage only |
| **Budget and spend** `/reports/budget` | — | Plan budget (040), unchanged | Renamed in the catalogue |
| **Purchasing** `/reports/purchasing` | Overview | Purchase requests by status; Committed by vendor; Committed by owner | |
| | Tab **Purchase requests** | PR grid (vendor › request › line › line item), column chooser | |
| | Tab **Waiting for SWBS** | GSAP link SWBS tab | |
| | Tab **Waiting for GSAP** | GSAP link Waiting tab | |
| | Tab **Purchase orders** | GSAP link Purchase orders tab | Invoiced per line shown once (here and in the PR grid's line rows, same figure) |
| **Approvals** `/reports/approvals` | — | Approval performance (041), unchanged | |
| **Plan data and access** `/reports/plan-data` | Tab **Data completeness** | Plan details (043) | |
| | Tab **People** | User access (045) | |

## User Scenarios & Testing

### User Story 1 - One place for performance against goal (Priority: P1)

A marketing lead opens **Performance** and sees the year at a glance (actual or projected, goal, performance,
every stage and its conversion), picks a stage, and reads its trend and ranked list without switching reports.

**Why this priority**: Summary, Revenue and Funnel stages repeat each other; most report visits are here.

**Independent Test**: Open `/reports/performance`; the overview equals today's Summary for the same filters;
switching stage changes the cards, trend and ranked list; grouping the ranked list by a Shell attribute and
sorting by ROI gives the order today's ROI league table gives.

**Acceptance Scenarios**:
1. **Given** demo data, **When** Performance opens, **Then** the overview strip shows the same figures as today's
   Summary and the stage is Revenue.
2. **Given** Revenue, **When** she picks MQL, **Then** cards, trend, conversion trend and ranked list show MQL and
   the address carries `stage=mql`.
3. **Given** the ranked list, **When** she groups by Country / OU and sorts by ROI, **Then** the top five equal
   today's ROI league table for Country / OU.
4. **Given** Revenue, **When** she opens an activity's attributed revenue, **Then** the deals panel opens as today.

### User Story 2 - The purchase request trail in one report (Priority: P1)

A requisitioner opens **Purchasing** and follows requests from status to purchase order without a second report.

**Independent Test**: The four tabs show today's PR grid and GSAP link tabs for the same filters; invoiced per
line matches between the PR grid and Purchase orders.

**Acceptance Scenarios**:
1. **Given** demo data, **When** Purchasing opens, **Then** the overview shows requests by status and committed by
   vendor and owner, and the Purchase requests tab shows today's grid.
2. **Given** the tabs, **When** he opens Waiting for GSAP, **Then** it equals today's GSAP link Waiting tab and the
   address carries `tab=waiting`.

### User Story 3 - Saved views keep working (Priority: P1)

Anyone with a saved view of an old report finds it on the right new report, stage or tab, with the same filters.
Old report addresses are not redirected: SP&A One is not released yet, so no one outside testing holds an old link
(product owner, 2026-11-13); an old address shows the usual page-not-found.

**Acceptance Scenarios**:
1. **Given** Priya's saved views on Revenue and Funnel stages, **When** the migration runs, **Then** both appear on
   Performance with their stage; a name used on both gets " (Funnel stages)" added; at most one stays her default.
2. **Given** a default view saved on Performance with MQL, **When** Performance opens, **Then** it opens on MQL.

### User Story 4 - Administration in one place (Priority: P2)

An administrator opens **Plan data and access** and switches between data completeness and people.

**Acceptance Scenarios**:
1. **Given** an administrator, **When** the page opens, **Then** Data completeness shows today's Plan details and
   People shows today's User access, the tab in the address.
2. **Given** a person who may open only one of the two today, **Then** only that tab shows.

### Edge Cases

- A report address with an unknown `stage` or `tab` opens the default with the usual "the view changed" notice.
- A saved view whose filters no longer apply keeps the ones that do (as 039 does today).
- Export from a merged page writes the sheets of the section or tab shown, named as today.
- A person without `reports.view` sees no Reports area, as today.

## Requirements

### Functional Requirements

- **FR-001**: The Reports page MUST list five reports: Performance, Budget and spend, Purchasing, Approvals and
  Plan data and access, grouped as today (Performance; Budget and spend, Purchasing; Approvals, Plan data and access).
- **FR-002**: Performance MUST show Summary's overview above a stage picker (Revenue · MQL · INQ), the chosen
  stage's cards, its trend by month or quarter with the Total row and goal-after-December note, the conversion
  trend for MQL and INQ, and the ranked list; Summary's separate Revenue trend MUST go (same series).
- **FR-003**: The ranked list's Group by MUST offer the Shell attribute segments Summary's league tables offer
  (Not filled in included, 048 FR-013), and its sort MUST offer revenue, performance, cost and ROI with ROI's model
  and cost basis named (048 FR-015); the four league tables MUST go.
- **FR-004**: Budget and spend MUST be today's Plan budget report under the new name and address.
- **FR-005**: Purchasing MUST show the PR overview widgets and four tabs — Purchase requests, Waiting for SWBS,
  Waiting for GSAP, Purchase orders — each equal to today's widget for the same filters; the tab MUST be in the address.
- **FR-006**: Approvals MUST stay as today.
- **FR-007**: Plan data and access MUST show Data completeness and People as tabs, each with its report's permission;
  a tab the person may not open MUST NOT show.
- **FR-008**: Every figure MUST keep its definition (measure-metrics.md) and come from today's endpoints; no new
  figure is defined by this feature.
- **FR-009**: Withdrawn (product owner, 2026-11-13): old report addresses are not redirected.
- **FR-010**: A migration MUST move every saved view to its new report key, set its stage or tab, add the old
  report's name to a clashing view name, and keep at most one default per person and report (the most recently
  updated); no view is lost.
- **FR-011**: Exports MUST keep today's sheets per section or tab; the export of a merged page names the section.
- **FR-012**: Report-page text that adds nothing (D-422's rule) MUST go in the rebuilt pages: group subtitles on
  the Reports page, "In view" counts repeated by Total rows, long ⓘ texts cut to their point.

### Key Entities

- **Report key** (saved views, catalogue, route rules): `performance`, `budget`, `purchasing`, `approvals`,
  `planData`; old keys map as in FR-009/FR-010.

## Success Criteria

- **SC-001**: The Reports page shows 5 reports instead of 9.
- **SC-002**: Every widget of the nine reports has a home in the map above (no figure lost), checked by a test
  listing the old widgets.
- **SC-003**: 100% of saved views survive the migration.
- **SC-004**: Performance's overview equals today's Summary, and its ranked list grouped by an attribute equals
  today's league table, for the demo data.

## Assumptions

- Report backends stay; the merge is a frontend, catalogue, route-rule and saved-view change, plus a goose
  migration for `report_views.report` (its CHECK lists the nine keys, migration 00030).
- Access rules keep `reports.view` for the reports and each report's existing extra rules.
- Report-page filter bars already follow D-421; report-specific filter bars (approvals GridFilters, PR
  GridToolbar) and "Reset filters" empty states move to the shared pieces in this feature.
