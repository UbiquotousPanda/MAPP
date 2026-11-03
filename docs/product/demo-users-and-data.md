# Demo Users and Seed Data

MAPP (shown as SP&A One) ships with a **fictitious** dataset so every feature can be demonstrated and tested. No real
Shell person, figure or code is used; option lists are realistic samples until Shell supplies the real
lists from a production data extract. The seed is loaded by an explicit command (defined in feature
001's plan) and never in a production environment.

Features add their own seed records; this page is the shared story they extend.

## Demo users (demo sign-in)

All demo users share the password **`mapp`**, shown on the sign-in page (decision D-004).

| Name | E-mail | Job title | Teams | Typical use |
|---|---|---|---|---|
| Alex Morgan | alex.morgan@shell.com | Marketing administrator | Global Marketing Ops | Settings, approval level 2 |
| Priya Raman | priya.raman@shell.com | Marketer | Lubricants Europe | Builds the Lubricants plan |
| Daniel Okoro | daniel.okoro@shell.com | Marketing team leader | Lubricants Europe | Approves Lubricants activities |
| Mei Lin | mei.lin@shell.com | Marketer | Mobility China | Builds the Mobility plan |
| Carlos Mendes | carlos.mendes@shell.com | Business champion | Mobility China, Global Marketing Ops | Approves Mobility activities (level 1) |
| Sara Novak | sara.novak@shell.com | Local finance advisor | Lubricants Europe, Mobility China | Reviews finance coding |
| Lea Santos | lea.santos@shell.com | Requisitioner | Global Marketing Ops | Role *Requisitioner* (All markets): the Purchase requests page, PR forms and the simulated GSAP (feature 032) |

**Roles** (feature 014; Settings › Roles and access): Alex Morgan — Administrator (All markets) · Carlos Mendes —
Global planner (All markets) · Daniel Okoro — Planner and Approver (My teams) · Priya Raman and Mei Lin — Planner
(My teams) · Sara Novak — Viewer (My teams) · Lea Santos — Requisitioner (All markets). New people get the Viewer
role, and nobody approves an activity they own or submitted. Each persona therefore sees a different part of the
data: Priya only Lubricants Europe, Mei only Mobility China, Sara both read-only, Carlos and Alex everything.

## Settings seed

| Record | Seed values |
|---|---|
| Teams | Lubricants Europe · Mobility China · Global Marketing Ops |
| Models | **Lubricants 1.0** — INQ→MQL 2 %, MQL→deal 5 %, deal size 10,000 USD · **Mobility 1.0** — 3 %, 4 %, 5,000 USD |
| Activity types | Agency fees – Creative · Event · Digital media · Content production · Sponsorship · MOBILITY – Long-term contract (Mobility only) |
| Currencies (units per 1 USD) | USD 1 · EUR 0.92 · GBP 0.79 · CNY 7.10 · INR 83.50 |
| Finance budget items | *2026 Lubricants Budget:* Europe – Digital · Europe – Events · Europe – Brand · *2026 Mobility Budget:* China – Retail · China – Fleet · Delhi · *2027 Lubricants Budget:* UK & Ireland – Events (Venue, L-1009) · UK & Ireland – Agency (Agency fee (Ireland), L-1010) |
| Line managers | Priya Raman and Sara Novak → Daniel Okoro · Mei Lin → Carlos Mendes · Daniel Okoro and Carlos Mendes → Alex Morgan · Alex Morgan has none |
| Approval workflows | **Lubricants EU approval** (WF-1001) — level 1: Daniel Okoro, backup Alex Morgan; remind after 1 day, escalate after 2 (short, so a demo shows both on the first run) · **China BC approval workflow** (WF-1002) — level 1: Carlos Mendes, backup Alex Morgan; level 2: Alex Morgan, backup Carlos Mendes; remind after 3 days, escalate after 5 · **Standard marketing approval** (WF-1003, used by no seeded activity) — level 1: the owner's line manager, approved automatically below 10,000 USD, backup Alex Morgan; level 2: Alex Morgan, only needed from 100,000 USD, backup Carlos Mendes; level 3 "Mobility second check": Daniel Okoro and Alex Morgan, all must approve, only for the Mobility business unit, backup Carlos Mendes; remind after 3 days, escalate after 5 |
| Approval delegations | **DLG-1001** — Daniel Okoro → Carlos Mendes from today + 7 days to today + 11 days, note "Annual leave" (planned, so it changes nothing in today's lists) |
| Shell attributes | The full set in the field catalogue, with 3–8 sample options each (e.g. Cluster: Lubricants – Europe, Retail – China, Fleet – China; Region per cluster; Company code: GB01, NL02, CN04), except Shell's own lists for the zero-based cost hierarchy (10), spend type (25), GL code (13), spend category (19) and contracted spend (5), e.g. spend type "ATL - Digital" with GL code "7250080 - Advertising - Digital" (D-325) |

## Planning seed (the demo story)

| Plan | State | Contents |
|---|---|---|
| **FY2026 Lubricants Europe** (Priya Raman, Lubricants Europe, Lubricants 1.0, budget 1,200,000 USD; the BCPIR plan, 013) | Published | 2 campaigns ("Helix launch", "Rimula fleet"), 4 initiatives, 7 activities in every status (Created, Submitted, Declined, Approved/In progress, Complete), line items in USD, EUR and GBP, one activity with a non-zero unassigned balance |
| **FY2026 Mobility China** (Mei Lin, Mobility China, Mobility 1.0, budget 800,000 USD) | Draft | 1 campaign, 2 initiatives, 3 activities — deliberately incomplete (missing cluster/region, missing GL code, Country/OU split at 90 %) to demonstrate completeness |
| **FY2027 Global Brand** (Alex Morgan, Global Marketing Ops, Lubricants 1.0) | Draft, Strategic / AOP | 1 campaign with an over-allocated initiative budget (negative remaining budget) |

Global budgets (feature 014): **FY2026 Global marketing budget** (2026, 2,500,000.00 USD, owner Carlos Mendes)
allocates 1,200,000.00 to FY2026 Lubricants Europe and 800,000.00 to FY2026 Mobility China, equal to their
budgets, so those plan budgets are read-only for their owners.

The recycle bin contains one deleted initiative (with its activity) and the activity log contains about
two weeks of back-dated history, so those screens are not empty in a demo.

Approval rules (feature 017) in the demo: the open round of **Trade magazine ads** (WF-1001) has waited two
days, so it is overdue on the Approvals monitoring and the first **Run reminders and escalations** escalates
it to Alex Morgan; **Fleet card launch** (WF-1002) waits at level 2. Submitting a Lubricants activity below
10,000 USD with WF-1003 shows an activity approved automatically.

Purchase requests (features 032 and 033) in the demo: Purchase Support is on and lines may join an approved
purchase request with modification approval. Two workflows approve them — **Purchase request approval (MoA)**
(WF-1004) and **Purchase request change approval (MoA)** (WF-1005), one level each that goes to the purchase
request's MoA approver, backup Alex Morgan, reminder after 3 days and escalation after 5. **PR-1001** "PR for
Agency fee (Ireland)" waits as Created on the UK plan's line item L-1010 for 23,000.00 EUR, delivery
30 Apr 2027, owner Priya Raman, MoA approver Daniel Okoro, vendor Brightside Media BV, Email group
G_GB_RETAIL. The Email group options include **DE_LUBES**, the recipient the walkthroughs route to.

## Showcase plans (optional)

`go run ./cmd/seed -reset -showcase` loads the demo data above and then two complete 2026 plans that look like
Shell's own (D-354). They come after the demo story, so every demo ID above stays the same; the tests load
without them.

| Plan | Owner · team | Budget | Campaigns → initiatives |
|---|---|---|---|
| **FY2026 Mobility China – V-Power & Recharge** (P-1005, Published) | Mei Lin · Mobility China | 1,600,000.00 USD | **V-Power Nitro+ relaunch** → Forecourt experience, Digital & loyalty; **Shell Recharge fleet electrification** → Fleet EV partnerships, Charging hub launches |
| **FY2026 Lubricants B2B Europe – Rimula & Tellus** (P-1006, Published) | Daniel Okoro · Lubricants Europe | 1,100,000.00 USD | **Rimula heavy-duty fleet 2026** → Fleet operator events, Digital lead generation; **Tellus & Spirax industrial uptime** → Hannover Messe 2026, Mining & construction accounts |

Their 12 activities have every field needed to submit filled, and each has one or two line items — 23 in USD,
EUR, GBP and CNY, linked to the 2026 finance budget items. Six are Approved with their approval history:
Forecourt POS refresh, Nitro+ racing heritage film and Fleet EV charging contracts (Carlos Mendes, then Alex
Morgan), and Rimula R6 fleet roadshow, Fleet operator breakfast series and Hannover Messe stand (Daniel
Okoro). The other six are Created, ready to submit. Their line items ask for SWBS codes but have none yet, so
a demonstration can send them to the simulated GSAP.

## Measure demo plan (optional)

`go run ./cmd/seed -reset -measure` adds **FY2026 Measure demo – Lubricants Benelux** (Published, owner Alex
Morgan) last, after the demo story and the showcase, so no ID above moves (D-354). Its team **Measure demo** has no
members: Alex Morgan, Carlos Mendes and Lea Santos see it through their All markets roles, and Priya, Daniel, Mei and
Sara see the demo story as before. The compose setup and the end-to-end suite load it; the Go tests load without it, except
Measure's own, which opt in with `apitest.WithMeasureDemo()`.

Its 2 campaigns, 3 initiatives, 9 activities and 13 EUR line items spread over every month of 2026, with the
plan's INQ goal and activities' INQ, MQL and revenue for the Measure reports. Five activities are Approved by Daniel
Okoro 1, 4, 7, 12 and 40 days before the seed time; their line items ask for SWBS codes, and four have one from the
simulated GSAP (Case study production, both Search media line items, Webinar speaker fees), so the GSAP link still
has a line item without a code in every wait band. **Fleet expo Rotterdam** waits for approval, **Workshop roadshow
Benelux** was declined, and **Dealer summit** and **Tellus trade press** are Created; Tellus trade press has no Shell
attributes, for Plan details' *Not filled in*.

Seven purchase requests, owner Alex Morgan, MoA approver Carlos Mendes, Email group BE_LUBES, one in each status:

| Purchase request | Status | What happened |
|---|---|---|
| PR for Social media, second half · 30,000.00 EUR | Created | — |
| PR for Webinar speaker fees · 30,000.00 EUR | Submitted | Waits for Carlos Mendes (WF-1004) |
| PR for Search media, first half – extra flights · 15,000.00 EUR | In review | **Two-level PR approval (Measure demo)**: Carlos Mendes approved level 1, level 2 waits for Alex Morgan |
| PR for Search media, second half – trial · 5,000.00 EUR | Declined | Declined by Carlos Mendes |
| PR for Search media, second half · 40,000.00 EUR | Approved | Routed to BE_LUBES two days ago, no GSAP PR number yet: *Waiting for GSAP* |
| PR for Search media, first half · 40,000.00 EUR | Approved | GSAP PR and PO from the simulated GSAP, two invoices of 10,000.00 EUR |
| PR for Case study production · 30,000.00 EUR | Closed | PO invoiced and paid in full, closed five days ago |

The purchase orders, invoices and payment are 6 GSAP transactions on those line items; the invoices and payment come
in one *Demo data (simulated GSAP)* import, the last, so Financials still shows the demo data as its source.

It also groups the demo's activity types into three **activity categories** (047): **Digital** (the default: Digital
media), **Events and sponsorship** (Event, Sponsorship) and **Content and creative** (Content production, Agency
fees – Creative). *MOBILITY – Long-term contract* is in none, so the reports' *Uncategorised* has activities too.
The categories are Settings, so every persona sees them; the plain seed has none.

Last, its **performance facts** (046 T110) arrive as a real upload: the data source **Measure demo feed** (owner Alex
Morgan, marketing automation, upload, monthly) with ten column mappings — Ref, Date, the keys Activity, Feed id and
External name, INQ, MQL and Revenue for Lubricants 1.0, Currency and Journey — and one file,
*measure-demo-feed.csv*, through 046's import as MAPP at the seed time: 14 rows, all matched, 20 facts, one load
(Undo works on it) and its one activity-log entry, after the demo history (D-188). The feed is the one active source of
Lubricants 1.0's INQ, MQL and revenue, so a second one is refused (046 FR-003): tests and demos load through it.

The facts are dated January to 9 March 2026, before the seed time under both the tests' clock (12 March 2026) and
any later run, on three Approved activities only:

| Activity | INQ by month (Jan · Feb · Mar) | MQL by month | Revenue |
|---|---|---|---|
| Helix search and social, first half | 600 · 650 · 200, plus 1 journey touch | 90 · 110 · 30 | 42,000.00 USD (no journey), 18,500.00 EUR (journey JRN-8E05) |
| Tellus case studies | 60 · 120 · 40, plus 1 journey touch | 10 · 20 · 5, plus 1 journey touch | 24,000.00 USD (journey JRN-2C71) |
| Tellus webinar series | — | 2 journey touches in March | — |

Two pseudonymous **journeys** (046-C6) feed 050's attribution: **JRN-2C71** — INQ on Helix first half (14 Jan), MQL on
Tellus webinar series (2 Mar), then 24,000.00 USD on Tellus case studies (6 Mar); **JRN-8E05** — INQ (22 Jan) and MQL
(12 Feb) on Tellus case studies, MQL on Tellus webinar series (3 Mar), then 18,500.00 EUR on Helix first half (9 Mar).
Each conversion is on an activity its journey did not touch, so attributed revenue differs from booked revenue under
every model; the 42,000.00 USD has no journey and stays wholly with its own activity. Equally distributed, the seeded
model, credits Helix first half 54,000.00, Tellus case studies 13,405.80 and Tellus webinar series 18,702.90 USD.
Tellus webinar series carries journey MQL only, so its INQ shows no actual and its projection stays the goal's alone
(`projections.spec.ts`).
