# Feature Specification: Summary Report

**Feature Branch**: `feature/048-summary-report`

**Created**: 2026-11-02

**Status**: Built (3 Nov; benchmark recorded: under 2 s waits on the shared scope read)

**Input**: User description: "Summary report of the Measure module (wave B, lane C, issue #41): projected against
goal with the variance word, the trend split at today, four league tables (top by revenue, performance, cost and
ROI for a chosen Shell attribute, each refreshing alone), stage volumes and conversion rates against goal, and links
into the Revenue and Funnel reports. Read-only; plugs into 039's report frame."

Cites: FA §E3.1; client 016 US1, US4 and FR-020–FR-053, FR-070–FR-075; [measure-metrics.md](../../docs/product/measure-metrics.md)
§2; 046 (performance facts), 047 (projections, activity categories), 049 (Revenue and Funnel stages, the shared
data path), 050 (attribution and ROI); the report frame of 039.

## Overview

Planning and marketing leads open the Revenue and Funnel stages reports (049) to rank and drill. This report is the
**executive landing view** that answers one question first — *are the plans in view on track?* — and then shows
which segments lead, and where the funnel leaks. It lives under **Reports › Summary** in 039's frame (filter panel,
period, display currency, saved views, "as of" line, table view and export of every widget) and changes none of it.

It has two stacked sections, as Hive9's Summary has: **Revenue** — projected revenue against goal with its
variance word, a trend split at today, and four league tables — and **Funnel** — each stage's volume against goal and
each conversion against its goal, with a conversion trend. Each section links to its detailed report.

Every figure is defined once in measure-metrics and worked out by the feature that owns it: actual from 046,
projected from 047, attributed revenue and ROI from 050. This feature defines the four figures measure-metrics
gives it — **Performance**, the **variance word**, **Goal coverage** and **Conversion rate** — and 049 shows the first
two with the same wording (049-C13, 049-C15).

## Clarifications

### Session 2026-11-02

- **048-C1** — Q: Which words does the variance use, and when? → A: **Above plan** when Performance is over 100 %,
  **On plan** at exactly 100 % (whole per cent), **Below plan** under it, and **No goal** when the goal is zero or
  absent — never "0 % above" (client 016 FR-039). Performance itself is (actual + projected) ÷ goal as a whole per
  cent (measure-metrics). measure-metrics lists two words; On plan and No goal are added there by the integrator.
- **048-C2** — Q: Which goal is "goal"? → A: **The sum of the goals of the activities in view**, as 049-C16 decides,
  because actual and projected are the activities' own. **Goal coverage** — the activities' goals ÷ the plans' goals
  per stage, a whole per cent — is a separate card, a planning-completeness check and never called performance.
- **048-C3** — Q: Does this report compute its own series? → A: **No: it reads 049's data path.** The actual,
  projected and goal series per activity and month come from `measure/revenue` (049-C1 to C4: one set-based read,
  one projection per activity, then summed), so Summary and Revenue can never disagree. This feature adds the
  segment grouping, the four league tables and the conversion figures on top.
- **048-C4** — Q: Which segments do the league tables offer, and what happens to a record with no value or several?
  → A: **Every active single- or multi-choice Shell attribute at the Plan, Campaign and Activity levels**, named
  with its level as 043 names it (Hive9's "marked as report segment" flag does not exist in MAPP); default the first
  Activity-level attribute. A record with no value counts under **Not filled in**; a record with several values is
  split in equal shares among them (client 016 FR-043), except a % split attribute, which shares by its own percentages
  as Revenue's ranked view does (D-270; 048-C14); the Total row counts every record once.
- **048-C5** — Q: What does a league table show? → A: **The five highest values** of its figure, then a **Total**
  row over all values (not only the five), with Name, the figure and a small Trend of the segment's actual or
  projected by month. Cost is **Actual cost** (paid in the plans' year, D-357); ROI and its cost basis are 050's, and
  every value is "—" with the reason while attribution is not configured (049-C6).
- **048-C6** — Q: How does a league table "refresh alone"? → A: **Each table has its own segment in the page
  address** (`revenueBy`, `performanceBy`, `costBy`, `roiBy`) and its own request, so changing one table's segment
  reloads that table only; saved views keep all four.
- **048-C7** — Q: Which stages does the funnel section show, and how are conversions measured when plans use
  different models? → A: **The stages any model in view allows, in funnel order** (INQ, MQL, Revenue; deals is not a
  stage, 049-C12). **Conversion rate** is a stage's actual ÷ the previous stage's actual, one decimal; its **goal** is
  the stage's goal ÷ the previous stage's goal, which works for any mix of models because goals already come from
  each plan's model; "—" on a zero denominator (client 016 FR-040).
- **048-C8** — Q: Is there an Activity category selector? → A: **Yes, the report's own `category` parameter**, as
  049-C10: default All categories, Uncategorised selectable, kept in the address and saved views.
- **048-C9** — Q: Can people choose and reorder the summary cards? → A: **No: fixed cards** (measure-metrics §3,
  Q-029; 049-C8). Sharing by e-mail is out of scope as everywhere in Reports.
- **048-C10** — Q: Where do the series and the variance word come from (lane B, 2 Nov)? → A: **From one shared read in
  `measure/revenue`, `ActivitySeries(ctx, a, f, category)`**, which lane B exports in a follow-up pull request right
  after #82 merges; Revenue and Funnel stages read through it too, so the three reports share one set of rules. The
  variance word of 048-C1 is worked out once inside that read, and 049 moves from "No goal set." to 048-C1's words in
  the same follow-up. 048 builds against #82 as fixed on 2 Nov (cards split the period in progress differently; Goal
  is the activities' sum, 049-C16), not its earlier head.
- **048-C11** — Q: Who adds 048's operations to the wave B contract? → A: **Lane C, with this feature**, as for 041
  and 042, with lane B (UbiquotousPanda) tagged to review.

### Session 2026-11-03

- **048-C12** — Q: `ActivitySeries` (#99) counts INQ and MQL and gives revenue as money; what is the conversion into
  Revenue? → A: **There is none.** A rate of money over a count of MQLs is not a conversion, so the funnel shows
  Revenue's volume as an amount and converts only between counted stages: MQL from INQ. `stage` takes `mql` only.
  The variance word and Performance come from 049's `revenue.Performance` and `revenue.VarianceOf` (048-C10).
- **048-C14** — Q: A % split attribute (multipleChoiceSplit) has its own shares, 80/20; does the league table split
  equally? → A: **No, by its shares (lane B's review of #106, S1).** D-270 and `measure/ranking` weight by share, so
  an 80/20 EMEA/APAC activity counts 80/20 in Summary as in Revenue's ranked view, with the same rounding (half up per
  share). Other multi-value attributes keep 048-C4's equal shares.
- **048-C13** — Q: Client 016 FR-027 shows earlier years as one "FY (total)" bucket each; does Summary? → A: **No.** A
  report covers one plan year (D-368, 039 Assumptions): multi-year selection is not adopted because plans are one
  year. The edge case is replaced, and convergence task T030 is closed without code.
- **048-C15** — Q: The ROI league table works ROI out from the facts' own revenue; is that right while 050's
  crediting is not wired in? → A: **No (#137 finding 1).** Until 048 reads attributed revenue through
  `attribution.Crediting` (lane A), every ROI value is "—" with "Attribution is not configured yet" and no model is
  named, as Revenue's ranked list answers.
- **048-C16** — Q: A conversion with a goal but no rate (nothing counted in the previous stage) says "No goal"; is
  that right? → A: **No (#137 finding 3).** "No goal" only when the goal is zero or absent (048-C1); with no rate the
  variance is null, shown "—".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Are we on track? (Priority: P1)

A planning lead opens Reports › Summary for the year and sees, for the plans in view, projected revenue against goal
with the variance word, Goal coverage, a trend of actual or projected against goal split at today, and the funnel:
each stage's volume against goal and each conversion against its goal, with a conversion trend for one chosen stage.

**Why this priority**: it is the question the report exists for, answered on one screen.

**Independent Test**: as Alex Morgan on the demo year, the projected revenue, goal and performance on Summary equal
the Revenue report's (049) for the same filters, and the stage volumes equal the Funnel stages report's.

**Acceptance Scenarios**:

1. **Given** plans in view with goals and performance data, **When** Summary opens, **Then** it shows the period
   label, "Projected against goal" as two amounts in the display currency, Performance as a whole per cent and the
   variance word (048-C1), and Goal coverage per stage (048-C2).
2. **Given** the trend chart, **Then** it plots actual or projected and goal by month or quarter, actual before
   today, projected after, the current period marked in progress, with a labelled Today marker and a table view.
3. **Given** the funnel section, **Then** each stage any model in view allows shows its actual or projected volume
   against its goal with Performance and the variance word, and each later stage a conversion card: the rate, its
   goal and the variance word (048-C7).
4. **Given** the conversion trend, **When** the person chooses a stage, **Then** the chart shows that conversion by
   period against its goal; the default is the first conversion stage (MQL), and the choice is kept in the address.
5. **Given** the Activity category control, **When** a category is chosen, **Then** only activities of that
   category count, everywhere on the page (048-C8).
6. **Given** a figure with no goal, **Then** Performance shows "—" and the word **No goal**, never a zero.
7. **Given** **Details** on either section, **When** it is chosen, **Then** the Revenue or Funnel stages report opens
   with the same filters, period, currency and category, and the funnel's chosen stage.

---

### User Story 2 - Which segments lead? (Priority: P2)

Below the revenue figure, four league tables show the leading segments by revenue, performance, cost and ROI, each
for a Shell attribute the person chooses.

**Why this priority**: once the lead knows whether the year is on track, the next question is where the money is
coming from and where it is not.

**Independent Test**: choose Company code on the Revenue table: the five rows are the five values with the most
revenue, the Total equals the revenue on Summary, and the other three tables do not reload.

**Acceptance Scenarios**:

1. **Given** each league table, **Then** it shows Name, its figure and a Trend for the five highest values and a
   Total row over all values (048-C5); the order is highest first, ties by name.
2. **Given** a table's segment selector, **When** the person picks another attribute, **Then** only that table
   reloads, and the choice is kept in the address and saved views (048-C6).
3. **Given** records without a value or with several (048-C4), **Then** they count under Not filled in or in equal
   shares, and the Total row still counts each record once.
4. **Given** ROI while attribution is not configured, **Then** every ROI value is "—" with "Attribution is not
   configured yet"; once 050 is configured, ROI names its model and cost basis next to the figure.
5. **Given** a person without financial access for some plans, **Then** cost and ROI of those plans show "—" with
   the count of plans left out; revenue, performance and volumes still show.

---

### User Story 3 - Export (Priority: P2)

The lead exports a widget or the whole page to discuss it.

**Acceptance Scenarios**:

1. **Given** any widget, **When** it is exported as CSV or Excel through the frame, **Then** the file holds its
   table view, the display currency named, each league table with every value (not only five).
2. **Given** the page export, **Then** every widget is a sheet, in page order; a person without `data.export` is not
   offered it.

---

### Report states *(read-only)*

1. **Data** → the sections show their figures.
2. **No plans in scope** → "No plans you may see for <year>".
3. **No goals** → "No goals are set for the activities in view" and what sets them; Performance and variance show "—".
4. **No performance data** → "No performance data has been loaded" (046); actual is "—", projected still shows.
5. **Activities not approved** → their facts are held (046 FR-020), said with the count.
6. **No model stage** → a stage no model in view allows is not shown; plans whose model lacks it are counted.
7. **No financial access** → cost and ROI "—" with the plans covered.
8. **Attribution not configured** → ROI "—" with the reason.
9. **Filters exclude everything** → the reason and a one-click reset.
10. **Loading and failure** → a placeholder of each widget's shape; a widget that fails names it and offers Try again
    without blocking the others.

### Edge Cases

- A plan whose model does not allow Revenue as a goal stage: its revenue goal comes from the model's rates and average
  deal size (measure-metrics), and the revenue figure still shows.
- One plan year only: 039's frame covers a single plan year (D-368), so there is no multi-year view and no
  "FY (total)" bucket (048-C13).
- A league-table value whose figure is "—" (no goal, no cost): it sorts after valued rows and is not counted among
  the five.
- Fewer than five values: the table shows them all and the Total.
- A conversion whose previous stage is zero: "—", not 0 % and not infinity.
- An activity whose type is in no category: counted under Uncategorised (047-C7).

## Requirements *(mandatory)*

### Functional Requirements

**Frame and access**

- **FR-001**: The report MUST appear as **Summary** under Reports and use 039's frame (filter panel, period, display
  currency, saved views, "as of" line, table view and export) without redefining any of it (client 016 FR-001, FR-005
  to FR-031).
- **FR-002**: The report MUST be read-only; the only thing it saves is a person's saved view through 039.
- **FR-003**: The report MUST need `reports.view`, export MUST need `data.export`, and every figure MUST come only
  from plans in the person's scope; cost and ROI of a plan without `finance.view` MUST show "—" with the plans covered.
- **FR-004**: The report's own parameters MUST be `category`, `stage`, `revenueBy`, `performanceBy`, `costBy` and
  `roiBy`, kept in the address and in saved views (048-C6, C8).

**Revenue section** *(US1)*

- **FR-005**: The section MUST show the period label, actual or projected revenue and goal revenue as amounts,
  Performance as a whole per cent and the variance word of 048-C1.
- **FR-006**: The section MUST show Goal coverage per stage (048-C2).
- **FR-007**: The trend chart MUST plot actual or projected and goal per period, split at today with the current
  period in progress and a labelled Today marker, and have a table view (client 016 FR-028, FR-048).
- **FR-008**: The figures MUST equal the Revenue report's (049) for the same filters and category (048-C3).

**Funnel section** *(US1)*

- **FR-009**: The section MUST show, for each stage any model in view allows, actual or projected volume against goal
  with Performance and the variance word (048-C7).
- **FR-010**: Each later stage MUST show a conversion card: the rate (one decimal), its goal and the variance word;
  "—" on a zero denominator.
- **FR-011**: A conversion trend MUST show the chosen stage's conversion per period against its goal, default the
  first conversion stage (client 016 FR-052).

**League tables** *(US2)*

- **FR-012**: Four tables — Revenue, Performance, Cost and ROI — MUST each show the five highest values of its figure
  for its chosen segment, with Name, figure and Trend, and a Total row over all values (048-C5).
- **FR-013**: Segments MUST be the active Shell attributes at Plan, Campaign and Activity level, Not filled in included,
  with equal shares for several values, or a % split's own shares (048-C4, C14).
- **FR-014**: Changing one table's segment MUST reload that table only (048-C6).
- **FR-015**: ROI MUST come from 050 with its model and cost basis named, and be "—" with the reason while
  attribution is not configured.

**Navigation, money and states**

- **FR-016**: **Details** MUST open the Revenue or Funnel stages report with the same filters, period, currency,
  category and stage (client 016 FR-053).
- **FR-017**: Amounts MUST be exact decimals in the display currency at the current rate (D-303); a missing value MUST
  show "—", never zero, and sort after valued entries (client 016 FR-030).
- **FR-018**: Every empty or partial widget MUST name its cause from the report states above (client 016 FR-074,
  FR-075); the backend states which cause applies.
- **FR-019**: Every figure MUST be computed on the server; ratios MUST be recomputed from summed numerators and
  denominators, never averaged (client 016 FR-044).
- **FR-020**: The report MUST respond within the time of SC-005 without a statement per row at the 028 volumes.

**Export**

- **FR-021**: Each widget MUST export to CSV or Excel through 039's export with its table view; league tables export
  every value; nothing is stored.
- **FR-022**: The report MUST NOT offer configurable summary cards, sharing by e-mail, or Hive9's "actual at monthly
  FX" (048-C9; measure-metrics §3).

### Key Entities

- **Goal per stage**: the sum of the goals of the activities in view per stage (048-C2).
- **Actual or projected**: actual to the end of the last period before today, projected from today (046, 047).
- **Performance**: (actual + projected) ÷ goal, whole per cent, with the variance word (048-C1).
- **Goal coverage**: activities' goals ÷ plans' goals per stage, whole per cent (048-C2).
- **Conversion rate**: a stage's actual ÷ the previous stage's actual, one decimal; goal from the goals (048-C7).
- **Segment**: one value of a Shell attribute at Plan, Campaign or Activity level, or Not filled in (048-C4).
- **League table**: the five highest segments by one figure with a Total over all (048-C5).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A planning lead answers "are we on track this year?" from Summary in under 30 seconds with no filter set.
- **SC-002**: For the same filters and category, Summary's actual, projected, goal and performance equal the Revenue
  report's, and its stage volumes the Funnel stages report's, in 100 % of checks.
- **SC-003**: Each league table's Total equals the section's figure, and changing one table's segment reloads that
  table only.
- **SC-004**: With the demo data, 100 % of the report states render a message naming their cause; no figure shows
  zero when the value is missing.
- **SC-005**: The report opens and responds within 2 seconds at the 028 volumes and passes the accessibility checks
  (WCAG 2.2 AA, keyboard use of every selector, table views and export).

## Assumptions

- 039's frame, 046's performance facts, 047's projection engine and activity categories, 049's `measure/revenue` data
  path and 050's attribution are on `measure-module` before this feature is implemented; 046, 047 and 049 are open
  pull requests today (#62, #75, #82), so implementing waits for them, specifying does not.
- The wave B contract is written by lane B; this feature hands its operations to the integrator in
  `contracts/api.md`, or adds them itself if lane A agrees, as 041 and 042 did.
- Goals, models, velocity and allowed stages are those of 047 and the domain model; this feature changes none of them.
- Out of scope: configurable cards, sharing by e-mail, Compare (049-C7), "actual at monthly FX", a new migration, and
  any change to the shared hub files or the decision log.
