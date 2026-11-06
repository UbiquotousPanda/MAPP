# Feature Specification: How attributed revenue is made up

**Feature Branch**: `feature/058-attribution-journeys`

**Created**: 2026-11-06

**Status**: Specified (6 Nov 2026), not built

**Input**: Integrator, after the demo prep of 6 Nov 2026: "On the Revenue report's ranked list, at the activity
level, clicking an activity's attributed revenue opens a side panel listing every deal that credited it — the
amount, its currency and conversion, the date and the activity that booked it, the journey's steps in date order,
and this activity's share under the model in use." Decision **D-409**.

**References**: Constitution 4.9 — Principles IV (the server works out every figure), VI, VII (scope as tenant),
IX, X · 049 (Revenue's ranked list) · 050 (crediting, D-398; ROI, D-399) · 046 (facts, journeys, held and replaced
facts) · [measure-metrics.md](../../docs/product/measure-metrics.md) §2 · D-024 and D-061 (converting parts) ·
reference design: `docs/demo/attribution-deals.html` on `claude/demo-script-aaf56b`, the hand-made page that
explained why *Tellus webinar series* is credited $18,702.90 while booking no revenue.

## Clarifications

### Session 2026-11-06 (integrator)

- **058-C1** Q: A journey can have steps in plans the viewer can't open. How do they show? → A: **They don't.**
  Crediting reads only the facts in the viewer's `reports.view` scope (050-C4, as built), so such a step is not
  read, takes no share and leaves no placeholder, count or gap; a deal booked in such a plan is not listed and
  credits nothing in their view, exactly as on the ranked list. A placeholder ("1 step in a plan you can't open")
  would need a read outside the scope, reveal that the customer met another team's activity and when, and sit
  beside shares that ignore it. The panel says once that it is worked out from the plans the viewer can open.
  Crediting across plans is Shell's call (058-Q1).
- **058-C2** Q: Which models does it explain, and can it compare? → A: **All five** of 050-C1: the panel runs 050's
  own crediting, so each model costs nothing more to explain. It shows the **designated** model, whose figures
  match the list, and may add **one comparison model** (US2) for this activity only; the Attribution view
  comparing every activity (client 020 FR-060, 050-C2) stays a follow-up.
- **058-C3** Q: How do the panel's figures stay equal to the list's, in every currency? → A: The panel runs the
  same reads and the same crediting as the list (FR-009). A deal's dollars become its exact part of 049's Actual:
  the deals of one activity, month and currency convert together with `money.ConvertParts` (D-024, D-409). In
  another display currency the activity's shares and the booked deals convert as parts too, so they add up to
  the list's figures, which convert each activity's total once (D-061). Deal amounts and step shares stay in US
  dollars, the currency revenue is shared in.
- **058-C4** Q: Which deals does the panel list? → A: **Every deal the activity is concerned in**: booked on it,
  or with a step on it that shares the deal — the deals that give it a credit, 0.00 included (D-399). So *Helix*
  lists the euro deal it booked, with $0.00, and the panel explains a credit below what was booked.
- **058-C5** Q: Held and replaced facts? → A: Neither is ever a deal or a step (046 FR-020, FR-013). The panel says
  how many held facts (in scope) wait on its deals' journeys, without figures; a replaced version is not
  mentioned, only the current one is shown.
- **058-C6** Q: Does the panel export? → A: **Yes**, as every widget does (039): CSV or Excel through the report's
  export with the widget `deals`, needing Export data, one row per deal, the usual notes (US3).

### Open questions for Shell

- **058-Q1** Should a journey be credited **across plans** — the same shares for everyone, steps in plans the
  viewer can't open shown as "a step in a plan you can't open" — instead of within each viewer's plans? It would
  reveal that such steps exist and when, and would change 050-C4 and every attributed figure.
- **058-Q2** An INQ and an MQL on one activity on the same day are **one step** (R3, as built). Should each fact be
  its own step, giving that activity two shares? And on a same-day tie for the last step, activity ID decides
  (R5): is another order wanted (an MQL after an INQ, say)?
- **058-Q3** Is the comparison model (US2) wanted now, or only with the full Attribution view?
- **058-Q4** Is a deal's **source reference** (from Shell's CRM export) safe to show to everyone with Reports view?
  If it can carry a customer's name, the panel numbers deals by date instead (Deal 1, 2…).

## Crediting rules (050 as built, `measure/attribution`, with D-409)

- **R1 Deals.** A deal is a revenue fact that counts — matched to an activity, not held, not replaced — dated in
  the report's year, on an activity in the viewer's `reports.view` scope.
- **R2 Journey.** A deal with a journey reference has a journey: the counted INQ, MQL and web-metric facts
  (sessions, visits, engagement touches) carrying the same reference, on activities in the viewer's scope, from
  any year. A fact that matched no activity is part of no journey until it is matched (050-C3).
- **R3 Steps.** One step per activity and day: facts on one activity on one day are one step, whatever their
  stages and counts; facts on one activity on different days are separate steps, each with its own share.
- **R4 Who shares.** The steps dated on or before the deal's date, the same day included. A later step takes
  no share of it (it may share a later deal of the same journey).
- **R5 Order.** By date; steps on the same day by activity ID.
- **R6 Weights**, over the n sharing steps, earliest first: First touch 1 for the first; Last touch 1 for the last;
  Equally distributed 1 each; Linear time decay k for the k-th; U-shaped 1 each when n ≤ 2, otherwise 2(n − 2)
  for the first and the last and 1 for each step between (40 % · 20 % · 40 %).
- **R7 Shares.** The deal's US-dollar cents × weight ÷ total weight, rounded down; the cents left over go to the
  step with the largest weight, the latest such step on a tie (under Equally distributed, the last step). An
  activity's share of a deal is the sum of its steps' shares.
- **R8 Booking.** The activity a deal is booked on earns nothing for booking it, only for its own steps.
- **R9 No journey.** A deal without a journey reference goes wholly to the activity it is booked on.
- **R10 Nothing to share.** A deal with a journey but no step on or before it goes to no activity: Unattributed.
- **R11 Currency.** Revenue converts to US dollars at the current rate before sharing; a deal in a currency with
  no rate is left out and counted (046-C7). *Changed by D-409:* the deals of one activity, month and currency
  convert together as parts (`ConvertParts`, D-024) in date-then-fact order, as 049's Actual groups them; as built
  each deal converts alone, which can differ from Actual by a cent per group.
- **R12 Concerned.** The activity a deal is booked on and each activity with a sharing step have a credit for it,
  0.00 when the model gives nothing (D-399).

## User Scenarios & Testing *(mandatory)*

The scenarios use the Measure demo data (`go run ./cmd/seed -reset -showcase -measure`, D-400): Alex Morgan,
Reports › Revenue, Year 2026, Show Activity, Equally distributed, US dollars unless a scenario says otherwise.

### User Story 1 - See the deals behind an activity's attributed revenue (Priority: P1)

A marketing manager sees *Tellus webinar series* credited $18,702.90 though it booked nothing. They click the
figure; a side panel lists the two deals it helped win, each with its journey and the webinar's share, adding up
to $18,702.90.

**Why this priority**: an attributed figure nobody can trace is not trusted; the demo needed a hand-made page.

**Independent Test**: open the panel for the three demo activities under two models and two currencies and check
every deal, step and share against the reference design.

**Acceptance Scenarios**:

1. **Given** the demo data, **When** Alex opens *Tellus webinar series*' $18,702.90, **Then** the panel lists MD-009
   ($24,000.00, 6 Mar, booked on *Tellus case studies*; steps INQ · *Helix search and social, first half* · 14 Jan
   and MQL · *Tellus webinar series* · 2 Mar, $12,000.00 each; share $12,000.00) and MD-013 (€18,500.00 = $20,108.70
   at 0.92 EUR per USD, 9 Mar, booked on *Helix*; steps INQ · *Tellus case studies* · 22 Jan, MQL · *Tellus case
   studies* · 12 Feb and MQL · *Tellus webinar series* · 3 Mar, $6,702.90 each; share $6,702.90); Credited is
   $18,702.90 and Booked here "—".
2. **Given** the same, **When** Alex opens *Helix*, **Then** MD-014 shows "No journey recorded, so it stays with the
   activity that booked it" ($42,000.00), MD-009 gives $12,000.00 for Helix's INQ step, and MD-013, booked here,
   gives $0.00 and says the activity that booked it earns nothing for booking it; Credited $54,000.00, Booked here
   $62,108.70 — the list's attributed revenue and Actual.
3. **Given** Last touch is designated, **When** *Tellus webinar series* is opened, **Then** its shares are
   $24,000.00 and $20,108.70, Credited $44,108.70, and the panel names Last touch.
4. **Given** the display currency EUR, **When** any of the three is opened, **Then** its shares in euros add up
   exactly to the list's euro figure, and the deals still show as booked and in US dollars.
5. **Given** a viewer who can't open the plan of one step, **When** they open a deal's activity, **Then** that step
   is absent with no placeholder, the other steps share the deal, and the panel's total equals their list's
   figure.
6. **Given** an address naming an activity outside the viewer's scope, binned or unknown, **When** the panel
   opens, **Then** it says "We can't find this activity" in all three cases.
7. **Given** the panel is loading, finds no deals, fails, or its deals' journeys have held facts, **When** it
   renders, **Then** it shows skeleton rows; "No data has arrived yet"; "We couldn't load the deals" with Try
   again; or "2 facts wait for their activity's approval and count nowhere yet".
8. **Given** the panel is open, **When** Alex presses Escape or Back, **Then** it closes and focus returns to the
   figure that opened it.

---

### User Story 2 - Compare with another model (Priority: P2)

Before changing the model in Settings, an administrator wants to see what Last touch would give this activity.

**Why this priority**: comparing made the figure clear in the demo ("same deals, same money, only the sharing
changes"); the panel is useful without it.

**Independent Test**: pick a comparison model and check the second share per deal and its total.

**Acceptance Scenarios**:

1. **Given** Equally distributed is designated, **When** Alex picks Compare with Last touch on *Tellus webinar
   series*, **Then** each deal shows a second share ($24,000.00, $20,108.70) and a second total ($44,108.70)
   labelled "Last touch, for comparison", after the designated model's.
2. **Given** a comparison, **When** the list, Settings › Attribution or another person's view is read, **Then**
   nothing has changed.

---

### User Story 3 - Export the deals (Priority: P3)

A planner exports an activity's deals to check them against Shell's CRM.

**Independent Test**: export CSV and Excel and compare with the panel.

**Acceptance Scenarios**:

1. **Given** Export data, **When** Alex exports *Helix*' deals as CSV, **Then** there is one row per deal with the
   panel's figures, the notes name the report, year, activity, model, currency, rate, exporter and time and carry
   the panel's scope sentence, and the shares add up to $54,000.00.
2. **Given** a person without Export data, **When** they open the panel, **Then** Export behaves as on the report's
   other widgets.

### Edge Cases

- A deal with two steps on this activity: one row, both steps marked, the share their sum (MD-013 on *Tellus case
  studies*: $13,405.80).
- A journey with many steps folds after five ("Show all 12 steps"); this activity's steps always show.
- A step after the deal is not listed under it (R4); an activity whose only step is after every deal has no deal.
- A step on an activity of another year or outside the filters still shares the deal (050-C3); its name links to
  the activity.
- A deal in a currency without a rate: left out, and the panel says how many of its deals were.
- An upload or a model change lands while the panel is open, or before it loads: when its total or model differs
  from the figure that opened it, it says "These figures changed since the report loaded" with Refresh the report.
- Year or currency changes while the panel is open: it reloads; other filters don't change it (050-C3).

## Requirements *(mandatory)*

### The panel

- **FR-001**: Wherever Revenue's ranked list shows an activity's own attributed revenue as an amount, 0.00
  included, the amount MUST open the panel for that activity; "—" keeps its reason and opens nothing; plan,
  campaign and initiative figures open nothing.
- **FR-002**: The panel MUST show the activity and its plan, the year, the designated model with its sentence
  (050 FR-001), **Credited to this activity** and **Booked on this activity** ("—" when nothing was booked).
- **FR-003**: It MUST list every deal the activity is concerned in (R12, 058-C4), sorted by this activity's share,
  largest first, then newest, 25 per page, the totals always over every deal.
- **FR-004**: Each deal MUST show its source and reference, date, the activity and plan that booked it (Booked
  here when this one), its amount as booked with its currency and, when not in US dollars, its dollars and rate,
  one sentence on how the model shared it, and this activity's share.
- **FR-005**: The steps MUST be listed in R5's order — stage or stages as the reports name them, activity
  (linked), plan, date, the step's share — this activity's steps marked "This activity" with a yellow
  you-are-here marker, then the deal itself ("Deal booked"), which earns nothing by itself.
- **FR-006**: A deal without a journey MUST say it stays with the activity that booked it; one with nothing to
  share (R10) MUST say no step came before it and show its amount as Unattributed.
- **FR-007**: The open panel and its comparison MUST live in the address (`deals`, `compare`), so a link or reload
  reopens it; Escape and Back close it and return focus; saved views MUST NOT keep it.

### The figures

- **FR-008**: The rules R1–R12 MUST hold exactly; the same-day order (R5) and one step per activity and day (R3)
  MUST be applied in Go, so the fakes and PostgreSQL agree.
- **FR-009**: Shares MUST come from 050's crediting, through one function giving each step's share, run on the
  reads the ranked list uses; nothing works a share out a second way, and the web app works out none.
- **FR-010**: Deals MUST convert to US dollars as parts (R11, D-409), for the list as for the panel, so the deals
  booked on an activity add up exactly to its Actual, and a plan's deals to the plan's Actual.
- **FR-011**: In US dollars a deal's shares plus its Unattributed part MUST equal its amount, and an activity's
  shares MUST equal the list's attributed revenue. In another display currency its shares and booked deals MUST
  convert as parts (`Display.Parts`) in the panel's order, adding up to the list's two figures.
- **FR-012**: The panel MUST say how many of its deals were left out for a currency without a rate.
- **FR-013**: When the panel's total or model differs from the figure that opened it, it MUST say so and offer
  Refresh the report.

### Access

- **FR-014**: Every read MUST be in the viewer's `reports.view` scope (050-C4, 058-C1): a step or deal on an
  activity they can't open MUST NOT be read, shown, counted or hinted at, in the panel or its export.
- **FR-015**: The panel MUST always say "Worked out from the plans you can open; someone who can open other plans
  may see different shares."
- **FR-016**: An activity outside the scope, binned or unknown MUST answer 404 `not_found`, shown alike.
- **FR-017**: Reading MUST need only Reports view; attributed revenue shows in full without `finance.view` (D-399).

### States

- **FR-018**: Loading MUST show the activity's name at once and skeleton rows in the totals and the list.
- **FR-019**: No deals MUST show "No data has arrived yet" and "No deal in <year> credits or was booked on this
  activity."; for an activity not approved yet, the reason is that its facts are held until it is (049-C20).
- **FR-020**: An error MUST show "We couldn't load the deals." with Try again, which reloads only the panel.
- **FR-021**: Held facts and replaced versions MUST never show as deals or steps; the panel MUST say how many held
  facts carry the journey reference of a deal it lists ("2 facts wait for their activity's approval and count
  nowhere yet"), counting only facts in scope and showing no figures.

### Compare and export

- **FR-022**: A **Compare with** choice MUST list the other four models, none by default; picking one adds this
  activity's share per deal and its total under that model, labelled "<model>, for comparison", after the
  designated model's; nothing is saved and nobody else's view changes.
- **FR-023**: Export (CSV · Excel) MUST go through the report's export with the widget `deals` and the activity,
  with Export data, one row per deal — deal, date, booked on, amount, currency, rate, US dollars, steps, steps on
  this activity, share (and the comparison) — the usual notes plus the model and FR-015's sentence; nothing is
  stored or logged.

### API

- **FR-024**: A new read, `GET /api/v1/reports/revenue/activities/{activityId}/deals` (`getRevenueActivityDeals`;
  `year`, `currency`, `compare`, `page`), MUST be in `openapi.yaml` first, with its rule
  `inPlan(authz.ReportsView)`, a contract test, and a scope-isolation test for every scoped store read it adds or
  changes.
- **FR-025**: Its statements MUST NOT grow with deals, steps or pages (028), with a benchmark at 028's volumes.

### Key Entities

- **Deal**: a counted revenue fact (R1) with its source reference, booking activity, amount and dollars.
- **Journey step**: one activity on one day of a journey (R3), with its stages and its share of each deal.
- **Deal share**: an activity's part of one deal under a model (measure-metrics §2).

## Success Criteria *(mandatory)*

- **SC-001**: For every demo activity, all five models and USD and EUR, the panel's Credited equals the list's
  attributed revenue and Booked here its Actual, to the cent.
- **SC-002**: A presenter answers "why is the webinar credited $18,702.90 with no revenue booked?" from the panel
  alone, without the reference page.
- **SC-003**: No name, date, count or amount from a plan outside the viewer's scope appears in the panel, its
  answer or its export (scope-isolation tests).
- **SC-004**: Every state of FR-018–FR-021 has a test; US1 has an end-to-end test with axe.

## Assumptions

- 046's facts stay as built: journey references are pseudonymous and never shown; no personal data (046-C6).
- The source reference is safe to show (058-Q4); the current rate applies (D-303).
- The panel uses the UI kit's `SidePanel`; the ranked list's cell becomes a button through 039's shared
  `RankedList` (build guide §4 rule 4).
- Funnel stages shows no attributed revenue, so it has no panel.

## Out of scope

- The Attribution view (client 020 FR-060), the six weighted models (FR-056), credit by a split attribute (FR-061).
- A panel for plan, campaign or initiative figures, or on Summary's leagues.
- Crediting across scopes (058-Q1).
