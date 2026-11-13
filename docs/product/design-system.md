# Design System — MAPP (version 2)

| | |
|---|---|
| **Version** | 2.3 · 28 October 2026 |
| **Status** | Binding for every screen of the web app. Code that disagrees with this document is a defect. |
| **Replaces** | Version 1 (Apple-inspired look: Apple blue `#0071e3`, blue-to-purple gradient, system font stack, pill shapes) |
| **Decided by** | Product owner, 20 October 2026: Shell yellow primary button with dark text, at most one per page or dialog (D-310); light-grey canvas with white cards (D-311); Jost headings and Arial body, no Shell logo (D-312); WCAG 2.2 AA (D-313); red only for danger and errors (D-314) — decision log D-310–D-314 |
| **Evidence** | [Shell brand research](../reports/ux-research-shell-brand.md) · [Shell UI patterns research](../reports/ux-research-shell-ui-patterns.md) · [UI audit](../reports/ui-audit.md) · [Functional review](../reports/functional-review.md) · [Recommendations](../reports/ux-design-recommendations.md) · [Implementation plan](../reports/ui-ux-implementation-plan.md) |
| **Code** | Tokens: `frontend/src/styles/tokens.css` · base styles: `frontend/src/styles/global.css` · shared components: `frontend/src/components/` · app shell: `frontend/src/app/` |

MAPP looks like a **Shell enterprise tool**: calm, structured, symmetric and ready for daily
production use. It follows Shell's current web design language (grey ink text, white cards on a light
grey canvas, Shell yellow only where you act and where you are, red only for danger and errors) and
applies it to a working application. Version 1's layout and interaction patterns stay (left sidebar,
summary cards, side panels, the standard CRUD pattern). Shell's Hive9 is the *functional* reference only:
its screens are never copied (D-005, functional part).

**What changed from version 1:** colours, fonts, type scale, spacing scale, control heights, radii,
shadows, breakpoints and page width are new tokens (§3); the app shell gains a white top bar and a white
sidebar with the yellow "you are here" bar (§2.1); there is one page-header layout and five page templates
(§2.3, §2.4); pill tabs become underline tabs; every shared component has a measured spec (§5); the
accessibility target is WCAG 2.2 AA (§9); and the consistency rules are written down as a checklist
(§11). The behaviour rules of §6–§8 and the usability targets of §10 are unchanged except where noted.

Section numbers §1–§10 are kept from version 1, so references in specs and code stay valid.

---

## 1. Principles

1. **A beginner understands every screen.** One purpose per page, plain words, nothing unexplained.
2. **One way to do each thing.** The same list, form, details, delete and status patterns everywhere.
3. **Status and next step are always visible.** Every record shows where it is (status chip) and what is
   missing (completeness), with a button for the next action.
4. **Show, don't hide.** Unavailable actions stay visible and explain why; read-only values say where they
   come from.
5. **Safe.** Confirm destructive actions, protect unsaved changes, offer Undo, keep a recycle bin.
6. **Calm.** White cards on a light grey canvas, grey ink text, one accent (Shell yellow) used only where
   you act and where you are, colour otherwise used only for meaning (status, level, money problems).
7. **Looks like Shell, behaves like MAPP.** Shell's colours, type pairing, grid, radii and wayfinding;
   its own name — SP&A One — as the logo, plain words and CRUD pattern. No Shell logo, typeface or trade dress until
   Shell grants them (§3.10, §12).
8. **One of everything.** One ink colour, one accent, one height per control size, one radius per kind of
   object, one spacing scale, one page header, one panel footer, one table style, one key–value layout,
   one date format. Inconsistency reads as "unfinished"; the UI audit traced most of its 97 findings to
   things built several ways.
9. **Symmetric and aligned.** Every page shares one left edge and one right edge; controls side by side
   have the same height; cards in a row have the same height; numbers line up under their headers.

---

## 2. Layout: app shell and page templates

### 2.1 App shell

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Demo environment — sign-in and data are for demonstration only            (banner 32, ink)   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [★] MAPP          (search slot, reserved)                       🔔3   (AB) Priya ▾      │ top bar 56, white
├────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│▌⌂ Home             │   Plans › FY2026 Lubricants Europe                     (breadcrumb 12)  │
│ ▤ Plans            │   Helix launch                           [⋯] [Submit for approval] [Edit]│ title 28 Jost
│ ✓ Approvals    (4) │   Campaign · Draft · 3 fields needed · C-1003 · Priya Raman · Feb–Nov   │ meta row
│ ▦ All work         │                                                                         │
│                    │   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │ summary cards
│ More               │   └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│ ⚙ Settings         │   Overview   Initiatives (3)   Details   History                         │ underline tabs
│ ↺ Recycle bin      │   ┌──────────────────────────────────────────────────────────────────┐  │
│ ☰ Activity log     │   │ white card: table, 40 px rows, money right-aligned                │  │
│                    │   └──────────────────────────────────────────────────────────────────┘  │
│ « Collapse sidebar │   MAPP · demo data                                     (footer 12) │
└────────────────────┴─────────────────────────────────────────────────────────────────────────┘
 sidebar 240, white          content: #F5F5F5 canvas, column ≤ 1300 px centred, 24 px padding
 ▌ = 4 px yellow bar + bold label + hover-grey fill on the current section
```

| Element | Rule |
|---|---|
| **Skip link** | First focusable element: "Skip to main content". Hidden until focused, then shown top-left: `--brand-yellow` fill, `--on-brand-yellow` text, 14 px bold, padding 16, radius 8. |
| **Environment banner** | `DemoBanner`. 32 px, full width, Text Strong `--banner-bg` with `--banner-text` (Surface) 12 px text, one line, centred. Below 600 px the shorter text "Demo environment — demonstration data only". Not sticky. |
| **Top bar** | 56 px, `--surface`, 1 px `--hairline` bottom border, full width, sticky at the top. **Left:** at ≥ 960 px the logo zone is 240 px wide, aligned with the sidebar (`Logo`, the name "SP&A One"); below 960 px a 40 px **Open menu** icon button, then `LogoTile`. The home link is named "SP&A One home". **Centre-left:** the global search slot (360–480 px), empty until a search feature is specified; never a fake control. **Right**, 8 px apart: the **Display currency** select (32 px, shows the code "USD"; its menu lists "USD – US dollar" and the other active currencies under the note that every page shows its amounts in it; the choice is saved for the person and applies to every page, reports and shared report links included; D-413), the light/dark theme switch, notifications bell (40 px icon button with `CountBadge`), the account button (32 px avatar + first name at ≥ 960 px; avatar only below). The account menu holds the name and role, **My profile**, **Appearance** (Follow the computer · Light · Dark; D-038) and **Sign out**. A help button joins the right group, always in the same place (WCAG 3.2.6), when a help feature exists. |
| **Sidebar** | 240 px, `--surface`, 1 px `--hairline` right border, sticky under the top bar, scrolls on its own. Items 40 px high, padding 0 16 0 20, 20 px icon + 12 px gap + 14 px label in `--ink`. Hover `--hover`, no movement. **Current section: a 4 px `--brand-yellow` bar on the start edge (full item height), `--hover` fill, bold label, `aria-current="page"`.** Group label "More" 12 px bold `--ink-2`, sentence case, 24 px above and 8 px below. Count badges sit at the end of the item. At the bottom: **Collapse sidebar** (40 px, ghost). |
| **Collapsed rail** | 64 px; icons centred; tooltips on the right; the yellow bar stays on the current item; badges become a small count at the icon's top end. Chosen by the person (saved, D-038) at ≥ 960 px; automatic between 600 and 959 px. |
| **Drawer** | Below 600 px the sidebar is hidden. **Open menu** opens a 280 px drawer from the left with `--overlay`, focus kept inside, Escape and the close button close it and return the focus. It shows the same items with labels, no tooltips. Bell and account stay in the top bar. |
| **Content area** | `--page-bg` (#F5F5F5) canvas. One column, at most `--content-max` (1300 px), centred in the space right of the sidebar, padding `--gutter` (24 px; `--gutter-sm` 16 px below 600 px), 24 px from the top bar to the breadcrumb row, 48 px bottom padding. When the sidebar collapses, the column grows (up to 1300 px). |
| **Footer** | Inside the content column, after the page: 1 px `--hairline` top border, 16 px padding, one 12 px `--ink` row (Text Subtle is too faint on the grey page, §3.1): "MAPP · demo data" (this phase). No marketing footer. |

Primary navigation for this phase: **Home · Plans · Approvals · All work** and, under **More**,
**Settings · Recycle bin · Activity log**. (Finance and Measure appear later.) My profile is reached from
the account menu.

**Layers (z-index):** sticky table header 10 · sticky form footer 50 · sidebar 90 · top bar 100 ·
overlay 200 · side panel and dialog 210 · menus and popovers 300 · toasts 400 · tooltips 500 · skip link 1000.

### 2.2 Grid, page widths and breakpoints

| Rule | Value |
|---|---|
| Content column | Fluid up to `--content-max` 1300 px, centred; side padding 24 px (16 px below 600 px) |
| Grid | 12 columns, `--grid-gap` 20 px between columns and between cards |
| Common spans | Summary cards: 4 per row (3 columns each), or 3 per row (4 each); details: 8 + 4 at ≥ 1280 px; two lists side by side: 6 + 6 |
| Forms and reading text | A form page is one column of at most `--form-page` 960 px, **centred** in the content column: breadcrumb, title, section bar, cards and sticky footer share it (§2.4 C). Reading text (descriptions, notes) stays at most `--form-max` 720 px wide |
| Breakpoints | **< 600** phone · **600–959** tablet · **≥ 960** desktop · one extra **≥ 1280** for the 8 + 4 split. No other widths may appear in a media query (§3.12). |
| Alignment | Logo zone, breadcrumb, title, toolbars, cards, tables and footer start on one left edge; page actions, toolbar ends and footer buttons end on one right edge. Every control in a row has the same height, so text baselines line up. |
| Equal heights | Cards in one grid row stretch to the same height. A list inside a card shows at most 5 rows and a **View all (n)** link, so neighbouring cards stay even. |

### 2.3 Page header (the only one)

Every signed-in page uses `PageHeader`; features never build their own header (§11, rule 3).

```
 Plans › FY2026 Lubricants Europe                                     ← breadcrumb row, 18 px, always reserved
 Helix launch                                     [⋯]  [Secondary]  [Primary]   ← title 28/36 Jost 700; actions
 Campaign · ▣ Draft · ▣ 3 fields needed · C-1003 · Priya Raman · 01 Feb – 30 Nov 2026   ← meta row (record pages)
 Every plan, campaign and activity in one place.                      ← description (list pages, optional)
```

| Part | Spec |
|---|---|
| Breadcrumb row | Always present and always one 12/18 line high, followed by 8 px, so the title sits at the **same position on every page** (desktop with the banner: title top at 138 px from the window top = banner 32 + top bar 56 + 24 + 18 + 8). Empty on top-level pages (Home, Plans, Approvals, All work, Settings). |
| Title | `<h1>`, the only one on the page; Jost 700, 28/36 (20/28 below 600 px); `--ink`; wraps to at most 2 lines. It is the menu name on top-level pages ("All work", "My profile"), the record's name on record pages, and "New activity" / "Edit activity" on form pages (the record's name is then in the breadcrumb). No eyebrow, no grey "highlight" phrase, no upper case. Home is the only exception: its title greets ("Good morning, Priya") in 32/40. |
| Actions | Right-aligned on the title's first line (vertically centred on it). Order from left to right: **⋯ More** (icon button), secondary buttons, **the primary button last**. At most one primary (§11, rule 1). Below 600 px the actions move under the title; only the primary and ⋯ stay, secondary actions move into ⋯. |
| Meta row | Record pages only, 8 px under the title, items 8 px apart, 14 px Text Strong (the header sits on the grey page, §3.1), single line that wraps: level tag, status chip, at most one completeness or problem chip, ID, owner, dates (one date format, §4.5). |
| Description | List and settings pages only, optional, one sentence, 14/20 Text Strong, at most 720 px, 4 px under the title. |
| Spacing | 24 px from the header to the content below it. |

### 2.4 Page templates

Every page is one of these five templates.

**A. List page** (Plans, Settings lists, People, Teams, Approvals)

```
 (breadcrumb row)
 Plans                                                                    [+ New plan]
 ┌ summary card ┐ ┌ summary card ┐ ┌ summary card ┐ ┌ summary card ┐       ← optional, ≤ 4
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │ [🔍 Search name or ID ] [All|Draft|Published] [Filters (1)]        4 of 6 plans │ ← toolbar 32 px
 │ [Years · 2026 ▾] [Plan type ▾] [Show ▾] [BCPIR plans ▾]                          │ ← Filters folded out
 │ (Year: 2026 ×) Clear filters                                                        │ ← filter chips
 │ Name ▲            Owner          Teams              Status      Planned cost    ⋯   │ ← table, §5.4
 └───────────────────────────────────────────────────────────────────────────────────┘
```

- The toolbar sits **inside** the table card (16 px 24 px padding) and spans its full width: search,
  segmented filter, **Filters (n)** button, then — pushed to the right end — the result count ("4 of 6
  plans"), view switch and **Export** where the page has them: the `FilterBar` of §5.2 (D-421). The filter
  menus fold out on the second row (by themselves when a filter is in use); filter chips go below only while
  filters are in use. Lists whose toolbar sits on the grey page (Plans, All work, reports) use the same bar.
- Empty list: `EmptyState` inside the card; filters hiding everything: "Nothing matches these filters" with
  **Clear filters**.
- Below 600 px: search takes the first toolbar row; inbox-type lists (Approvals, Home lists) become stacked
  cards; other tables scroll sideways inside their card with a scroll cue.

**B. Record page** (plan, activity, line item, Shell attribute)

- Page header with breadcrumb, meta row and actions (§6.3 decides which action is primary).
- An `InlineAlert` directly under the header when the record waits or was declined ("Declined by Daniel
  Okoro on 12 Mar 2026: The planned cost is above this quarter's budget…") — never buried further down.
- Up to 4 summary cards (money and progress facts).
- **Underline tabs** when the record has three or more content areas; the first tab is the working view:
  plan → *Plan tree · Details · History*; activity → *Overview · Details · Approval · History*. The chosen
  tab is kept in the address (`?tab=details`). Records with fewer areas stack their cards in one column.
- At ≥ 1280 px a details area may split 8 + 4 (main content + a summary card); cards in the split stretch
  to equal height.

**C. Form page** (new and edit plan, activity, line item, purchase request)

```
            Plans › FY2026 Lubricants Europe › Edit
            Edit plan
            ┌ Basics ✓  Budget ✓  Shell attributes 3 needed  Goals │ 8 of 11 needed fields filled ┐ ← sticky
            └━━━━━━━━──────────────────────────────────────────────────────────────────────────────┘   section bar
            * Required
            ┌ Basics ──────────────────────────────────────────────────────────────────────────────┐
            │ Plan name                                                                            │
            │ Year                                      Plan type                                  │ ← a deliberate pair
            └──────────────────────────────────────────────────────────────────────────────────────┘
            ─────────────────────────────────────────────── [Cancel] [Save and add another] [Save]  ← sticky footer
            |←──────────────────────────── column ≤ 960 px, centred ─────────────────────────────→|
```

- `FormPage`: one column of at most `--form-page` 960 px, centred in the content column. The page header,
  the section bar, the cards and the sticky `FormFooter` all share it, so the title, the cards' left edge
  and Save line up; nothing sits beside the column.
- The **section bar** ("On this page", `SectionBar`) sits at the top of the column and sticks under the top
  bar while the form scrolls: a white bar of section links, each with how many needed fields it still lacks
  ("2 needed", in the problem text colour) or a green check when all are filled, and on its right, after a
  divider, the overall count ("9 of 15 needed fields filled", shown only here). A link scrolls to its
  section and puts the focus on its first field. The section being read is bold with a 3 px yellow bar
  under it ("you are here"). Links that do not fit scroll sideways and fade out under the count, which
  stays in view; the bar never wraps. Whatever must stay in view with it goes right under it inside the
  sticky area (the line item's summary strip: planned cost · unassigned now · after saving). Focused
  fields and jumped-to sections land below the bar, never under it.
- One `FormSection` card per section, 20 px apart, in the order of §7; fields one per row.
- **Deliberate field pairs** (`FieldRow`): only related short fields sit side by side, and only where the
  column is at least 640 px wide (a container query, so they stack on narrow screens). Plan: Year + Plan type,
  Teams + Owner, Plan currency + Plan budget, Default finance budget + Default line-item spread, Goal stage +
  Goal amount. Names, models, descriptions, radio groups and check boxes stay full width. Paired labels align
  at the top, and when only one of the pair has a "Default: …" hint the other keeps the hint's line, so the
  two controls line up. Never pair fields just to fill the width.
- `FormFooter` is sticky at the bottom of the window across the column; buttons are right-aligned on the
  column's right edge.

**D. Settings section** (Settings hub and its sections)

- Hub: link cards, 4 per row at ≥ 1280 px, 2 per row from 600 px, 1 below (8 sections fill two full rows).
- A section is a list page (template A) with breadcrumb "Settings › Models", title "Models", segmented
  filter **Active (n) · Inactive (n) · All (n)** (default Active) and the count line "4 of 5 models".
- Short records open in a side panel; long ones (Shell attributes) on a record page (§6.2).
- When someone may only view a section, an `InlineAlert` (info) under the header says so; edit actions stay
  visible and explain why they are unavailable (§6.6).

**E. Dashboard** (Home)

- Header: the greeting title; the display-currency select and the My teams / Everything switch in the
  actions slot (no primary button: Home has no create action).
- A row of 4 link summary cards (2 × 2 below 600 px).
- Two equal columns (6 + 6) at ≥ 960 px: *Needs your attention* and *Waiting for my approval*, each at most
  5 rows plus **View all (n)**; then full-width *Plans at a glance* (table) and *My activities* (list);
  *Recent changes* only once the activity log exists.

### 2.5 Navigation and flows

| Situation | Rule |
|---|---|
| Where a record opens | **Side panel** for short records without child tables: campaign, initiative, Settings items, person, team, approval workflow, approval preview. **Full page** for records with children or long forms: plan, activity, line item, Shell attribute. |
| Breadcrumb | On every page below the top level, from the section to the current page. A side panel never repeats the page's breadcrumb; it names its parent as a value ("Plan: FY2026 Lubricants Europe"). Below 600 px only "‹ Parent" is shown. |
| After create | Toast "Initiative 'Digital & social' created — View"; the new row is highlighted (`--hover` and a 4 px yellow start bar) and scrolled into view. |
| After delete | Back to the parent; toast with **Undo** (10 seconds). |
| Leaving with unsaved changes | "Discard changes?" with **Keep editing** (focused) and **Discard changes**. |
| Approver's flow | Approvals → preview panel → **Approve** (primary) and **Decline** side by side → next item. |
| Menus with children | The first item goes to the parent itself ("Go to: Settings"). |

### 2.6 Purchase requests (features 032, 033)

| Screen | Template and rules |
|---|---|
| **Purchase requests** (`/purchase-requests`, sidebar after Financials, only with "See the Purchase requests page" and while Purchase Support is on) | List page (A) without a primary button: purchase requests are raised from a line item; **New purchase request** is secondary and asks for the line item first. Toolbar: search ("Search ID, name, vendor, HX key, GSAP PR or PO number"), segmented **All · Waiting for GSAP** (the requisitioner's queue), Filters (Status, PR type, Vendor, Owner, Created from/to, each type and vendor with "Not completed"), removable chips, the count, sort and pages of 50 — all in the address, so Back keeps them. The table is grouped by vendor (a heading row with the number of PRs and the totals the API counts); each PR row opens its lines (line item, HX key, amount in its own currency, delivery and Sent dates, PO number, line and status, invoiced). Empty: "No purchase requests yet — purchase requests are raised from a line item's Purchase requests section."; no match: "Nothing matches these filters" with **Clear filters**; Purchase Support off: "Purchase requests are switched off for your organisation." |
| **Purchase request** (`/purchase-requests/<id>`) | Record page (B): level tag PURCHASE REQUEST, status chip (Created · Submitted · In review · Declined · Approved · Closed; "· Change in review" while an approved PR's change waits), completeness chip listing what stops submitting (each item opens the field, the activity or the line item), ID, owner. **Edit** is the one primary; Submit for approval / Re-submit, Download PR form and **Create GSAP PR and PO (simulated)** are secondary; More holds Resend PR form, Close purchase request, View history and Delete purchase request (last, red). The server's notice sits under the header ("Awaiting approval — saving changes will restart approval."). Cards: Details · GSAP data · Lines · Approved version (only while a change is in review) · Approval · Routing history · History. |
| **New / Edit purchase request** | Form page (C): sections *Purchase request* (name, description, owner, MoA approver, the two workflows of the right type, the Shell attributes of level Purchase request) and *Lines* (one card per line: line item and HX key read-only, SWBS code read-only, currency, amount, delivery date, overall limit, description, PR line attributes; **Add line** opens the line-item picker, **Remove line** asks first). The footer's primary button says what happens: **Save** (Created, Declined), **Save and re-submit** (Submitted, In review), **Submit changes** (Approved). Every problem at once; a version conflict keeps the entries and offers **Reload**. |
| **Line-item picker** | Dialog with search over name, ID and HX key; each line item shows its activity and Available to request; line items that can't be added stay listed with the reason ("Already on this purchase request", "Nothing left to request", "One purchase request cannot charge two company codes (GB01 and NL02).") and can't be chosen. |
| **Line item › Purchase requests**, **Activity › Purchase requests** | A section after Financials (line item) or Line items (activity): Total requested and Available to request (negative as "Requested above planned cost by …"), the PRs; **New purchase request** (secondary) when the person may raise one, else its reason. |
| **Settings › Purchase requests** | A small form: Purchase Support (on/off) and Lines on approved purchase requests (Not allowed · Allowed with modification approval · Allowed without approval); read-only with the reason without "Change Settings". |
| **Approvals** | A purchase request row opens its preview panel (summary, lines, total, chain, latest history) with **Approve** (primary) and **Decline**, and **Open purchase request**. |

Words: "Purchase request" (never "PR form" as a title; the PR form is the downloadable file), "PR line",
"HX key" (always with "Generated from the line-item ID"), "Requisitioner", "Waiting for GSAP". Every GSAP
field (GSAP PR number and date, PO number, line, status, date and value, invoiced) is read-only with "Filled
by GSAP"; while the simulated GSAP fills them the source reads **Simulated GSAP** (033). Confirmations name
the record and the money: "Delete purchase request 'PR for Stand build'? Its 2 lines will be removed and the
money reserved on line items L-1006 and L-1011 will be released. You can restore it from the recycle bin.";
"Remove the line for line item L-1006 (3,200.00 EUR) from this purchase request? The 3,200.00 EUR reserved on
the line item will be released."; Close lists each line's current, invoiced and released amount before it
asks; "The simulated GSAP will create a GSAP PR and a purchase order with 1 line (10,000.00 USD) for PR-1002."

### 2.7 SP&A view (feature 013)

`/plans/<id>/spa`, reached by **SP&A view** (secondary) in the plan page's header. A read-only page: breadcrumb
Plans › plan › SP&A view, title "SP&A view", meta row with the plan's status chip, its **BCPIR** tag and year,
and **Open in All work** (secondary; no primary button). Under the header, on the grey page: **Scope** (Whole
plan or one campaign) and "Finance data as of …". Then a figures card (Planned cost, Committed, Actual spend,
Remaining, Utilisation with its bar, Variance; overspend red with the word "Overspend"); *Spend by period*
(Quarters · Months, planned and actual with bars, Not yet scheduled) beside *Spend by dimension* (Group by,
share with a bar, totals row); *Activities* (sortable table, ▸ opens the line items, ⋯ Raise purchase request
for each line item or its reason); *Budget* beside *Purchase requests*. Every underlined amount opens a side
panel "What makes up …" with the activities and their total. Scope, dimension, period and sort are in the
address, so Back keeps them. The BCPIR tag (outlined, like the plan type) also marks BCPIR plans on the Plans
list, the plan header and All work's plan rows.

### 2.8 Report pages (the Measure module, features 039–050)

`/reports` lists the reports the person may open in three groups (Performance, Budget and spend, Process and
governance), as tiles: a 96 px illustration in the group's chart colour, the report's name, the question it
answers in bold and the audience; the whole tile is one link and the ⓘ holds the longer purpose. `/reports/<report>`
is one report, in the **report frame** (039):

- **Header**: breadcrumb Reports › report, the title, the meta line "2026 · Figures as of … · In view: 2 plans ·
  …", and on the right **Copy link**, **Saved views** and **Export** (all secondary, 32 px; Export downloads at once
  when the report has one format and opens a menu when it has several). No primary button — a report acts on
  nothing.
- **Toolbar**, the list `FilterBar` (§5.2, D-421) on the grey page: **Year**, **Filters (n)**, the report's own choices
  (Activity category, Funnel stage); no Currency — reports follow the top bar's display currency (D-413). **Filters** folds out All work's filter buttons (§5.2) —
  Plans, Plan type, Team, Owner, Activity type, Activity status and **More filters** for the Shell attributes by
  level; each change applies at once, and the filters in use show as removable chips with **Clear filters**.
  Changing the year says first, at the top of the Year menu, that it clears the chosen plans.
- **Widgets** sit on a grid whose empty tracks collapse: the KPI **StatStrip** first, then charts, then tables.
  A widget's header holds its title with the ⓘ, then on the right only the controls that change that widget —
  **Months · Quarters** on time charts, **Plan · Campaign · Initiative · Activity** on the ranked list — the
  icon-only **Chart · Table** switch and an icon-only download named "Export <widget>". Headers never wrap; a
  long title ends in an ellipsis.
- **Charts** use ECharts (ADR-0020) at a fixed 260 px height: compact y-axis labels, hairline gridlines, an axis
  tooltip with exact values, a legend of the series that have data, and **Today** as a dashed `--ink-2` line that
  keeps its period's label. Goals are outline bars behind the filled actual or projected bars.
- **Ranked list**: the name column stays put while the table scrolls sideways (a fade at the right edge says
  there is more); a parent's name drills in (chevron), the ↗ icon opens the record; an empty figure is "—" with
  its reason as a tooltip, and a reason true of every row is said once above the table; performance is the % with
  a status chip (Above plan · On plan · Below plan); the shared **Pager** below.
- **Total row** (D-414): every report table whose figures add up — ranked lists, widget table views, the Purchase
  requests grid, the GSAP link tables — ends with a `<tfoot>` row headed "Total" (a row header) in the §5.4 totals
  style (`ui/Table`'s `total`: 700 weight, `--gray-bg`, no extra border, Text Strong on the grey).
  Its figures come from the API over every page; it never moves with the sort and is absent when there are no rows.
- Empty states say why — "No plans you may see for 2027", "Your filters exclude everything" with **Reset
  filters**, "No purchase requests in 2026" with where to look instead. Financial figures the person may not see
  show "—" and the count of plans the figure covers. Reports are read-only for everyone.

---

## 3. Visual tokens

All values live in `frontend/src/styles/tokens.css`; components use `var(--token)` only (§3.12). Light
values sit on `:root`, dark values on `:root[data-theme='dark']` (set by `theme.ts`, D-038).

### 3.1 Colour

The palette is Shell's and is non-negotiable (constitution Principle X, feature 020): the tokens below
carry Shell's values exactly, and no other value fills their roles — no tints, shades or opacity
changes. Contrast ratios use the WCAG 2.x formula. AA needs **4.5:1** for text, **3:1** for large text
(≥ 24 px, or ≥ 18.66 px bold), icons, control borders and focus indicators.

**Brand colours (both themes)**

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--brand-yellow` | `#FFC600` Primary Yellow | 1.45 on white: **fill only** | The primary button, the 4 px "you are here" bar (current sidebar item, selected tab, highlighted row), the skip link |
| `--brand-yellow-hover` / `-pressed` | `#FFCB14` / `#EBB600` | ink on them 9.56 / 7.78 | Primary hover and pressed |
| `--on-brand-yellow` | `#292929` (light Text Strong, both themes) | **9.23 on yellow** | Text and icons on yellow (never white) |
| `--brand-name-amp` | `#003C88` · dark `#6F9BD1` | 10.49 · 5.05 on Surface | The "&" of the product name only (§3.10) |
| `--brand-name-one` | `#AD8700` · dark `#FFC600` | 3.36 · 9.23 on Surface | "One" of the product name only: the only yellow text (§3.10) |
| `--brand-tile` / `--on-brand-tile` | `#003C88` / `#FFC600`, both themes | 6.65 | `LogoTile` and the favicon only |
| `--danger-bg` | `#DD1D21` Secondary Red | white text 4.92 | The destructive confirm button, problem chips, a highlighted destructive menu item. Hover underlines the label: red has no hover shade |
| `--on-accent` | `#FFFFFF` | – | Text and icons on red |
| `--button-primary-bg`, `-bg-hover`, `-bg-pressed`, `-text` | aliases of the yellow tokens | – | The primary button |

**Theme colours** (the palette role, then the token that carries it)

| Palette role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Foundation Base | `--page-bg`, `--gray-bg` | `#F5F5F5` | `#1C1C1C` | The canvas behind cards; fills inside cards (table header band, totals row, read-only boxes) |
| Surface | `--surface` | `#FFFFFF` | `#292929` | Cards, panels, side panels, the drawer, the top bar and the sidebar |
| Raised | `--raised` | `#FFFFFF` | `#343434` | Menus, popovers, dialogs and toasts |
| Text Strong | `--ink` | `#292929` | `#F5F5F5` | All text, headings and icons; secondary text where Text Subtle is too faint (below) |
| Text Subtle | `--ink-2`, `--muted` | `#757575` | `#919191` | Secondary text (labels, descriptions, meta, hints); placeholders |
| Link | `--link` | `#4B78AA` | `#54B8C8` | Links; underlined inside sentences (WCAG 1.4.1). `--blue` is an alias: checked check boxes, radios and switches |
| Link Visited | `--link-visited` | `#9A60A4` | `#AF81B7` | Defined, not applied to in-app links: in a single-page app nearly every link is visited |
| Link Hover | `--link-hover` | `#6E94C0` | `#8CB4E6` TODO(DARK_TOKENS) | Large text and icon-only links only; a hovered body-size link keeps `--link` and is underlined |
| Link Press | `--link-pressed` | `#4B78AA` | `#54B8C8` | As Link |
| Border Strong | `--control-border-hover` | `#292929` | `#F5F5F5` | A hovered, focused or emphasised control (a filter in use) |
| Border Medium | `--control-border` | `#757575` | `#919191` | Edges of inputs, selects, check boxes, segmented filters, outlined buttons (4.23 or more) |
| Border Subtle | `--hairline`, `--row-divider`, `--card-border` | `rgba(28,28,28,.135)` | `rgba(255,255,255,.09)` | Card edges, dividers, lines between rows, error-box frames |
| Hover Background | `--hover` | `#EBEBEB` | `#262626` | Hovered rows, items and buttons; the current sidebar item; the highlighted row |
| Press Background | `--chip` | `#E0E0E0` | `#121212` | Pressed buttons; neutral chips and tags, progress tracks, loading shapes, search matches |
| Disabled Background | `--disabled-bg` | `rgba(28,28,28,.04)` | `rgba(255,255,255,.032)` | Disabled controls, which still say why (§5.1) |
| Disabled Text | `--disabled-text` | `rgba(28,28,28,.38)` | `#B0B8C1` TODO(DARK_TOKENS) | Labels of disabled controls |
| Disabled Border | `--disabled-border` | `rgba(28,28,28,.135)` | `rgba(255,255,255,.09)` | Edges of disabled controls |

**Built on the palette**

| Token | Value | Use |
|---|---|---|
| `--focus-ring` | `--ink` (Text Strong of the active theme) | The 2 px focus ring with a 2 px offset (a 2 px inset inside scrolling boxes): 9:1 or more against every surface and against yellow |
| `--avatar-bg`, `--banner-bg`, `--tooltip-bg` | `--ink` | Initials circles, the environment banner, tooltips; what sits on them is `--surface` (`--banner-text`, `--tooltip-text`) |
| `--overlay` | `rgba(0,0,0,.45)` / dark `rgba(0,0,0,.6)` | Behind dialogs, side panels and the drawer (elevation, like the shadows of §3.5) |

**Where text may sit** (constitution X). Text Subtle, links and red text reach 4.5:1 only on some
backgrounds; everywhere else they are written in Text Strong:

| Text | Surface | Raised | Foundation Base | Hover Background | Press Background |
|---|---|---|---|---|---|
| Text Strong, light · dark | 14.55 · 13.34 | 14.55 · 11.42 | 13.34 · 15.63 | 12.20 · 13.88 | 11.02 · 17.18 |
| Text Subtle, light · dark | 4.61 · 4.62 | 4.61 · **3.95** | **4.23** · 5.41 | **3.86** · 4.80 | **3.49** · 5.94 |
| Link, light · dark | 4.60 · 6.28 | 4.60 · 5.38 | **4.22** · 7.36 | **3.86** · 6.53 | **3.48** · 8.09 |
| Red text, light | 4.92 | 4.92 | 4.51 | **4.12** | **3.72** |

Bold ratios are below 4.5:1: there the text is Text Strong unless it is large. The code does this by
redefining the tokens on the container (`--ink-2: var(--ink)`, and `--link`, `--danger-text`,
`--status-problem-text` where needed): the page header on the grey page, grey fills inside cards,
hovered and highlighted rows and items, and menus and dialogs in the dark theme. Text written directly
on `--chip` uses `--ink`. In the dark theme red is a fill only.

**Feedback colours** (outside the palette, one meaning each; the status families of §4.1 use them)

| Token pair (colour / `-text`) | Meaning | Light | Text on white · grey · its 8 % tint | Dark | Text on page · surface · its 12 % tint |
|---|---|---|---|---|---|
| `--info` / `--info-text` | Information, "running" | `#336094` / `#2B5482` | 7.80 · 7.15 · 6.94 | `#6F9BD1` / `#8FB4E3` | 7.96 · 6.79 · 5.63 |
| `--success` / `--success-text` | Done well, approved | `#008557` / `#00704A` | 6.15 · 5.64 · 5.52 | `#3DBB8C` / `#4CC79A` | 8.07 · 6.89 · 5.61 |
| `--warning` / `--warning-text` | Waits for someone, needs a look (amber, never brand yellow) | `#C77700` / `#8F5400` | 6.11 · 5.61 · 5.60 | `#E09A2A` / `#F0A640` | 8.30 · 7.09 · 5.74 |
| `--danger` / `--danger-text` | Errors and danger only | `#DD1D21` / `#DD1D21` (Secondary Red) | 4.92 · 4.51 · never tinted | `#FF5C5F` / `#FF7B7E` TODO(DARK_TOKENS) | 6.81 · 5.81 · never tinted |

The colours themselves (dots, bars, icons) are ≥ 3:1 on white and grey. Red is never tinted: an error
box is white with a Border Subtle frame and a red start bar, and a problem chip is a red fill.

**Retired tokens:** `--brand-gradient` and `--brand-gradient-strong` (version 2); `--brand-yellow-tint`
and `--danger-bg-hover` (feature 020: palette colours are never tinted or shaded). The navy `#092949`
and Shell dark blue `#003C88` roles moved to palette tokens; `#003C88` remains only as the plan level
colour (§4.2).

**What each colour may and may not do**

| Colour | Use it for | Never use it for |
|---|---|---|
| Primary Yellow | The one primary button of a page or dialog; the 4 px current-place bar on the current sidebar item, the selected tab and the highlighted row; the skip link | Text, icons or thin lines on light surfaces (1.45:1) — the product name's "One" is the only yellow text, in its own token (§3.10); a focus ring; tints; warnings (amber is used); pins or favourites; large areas; chart series; a second yellow button |
| Secondary Red | The destructive confirm button; problem chips; a highlighted destructive menu item; error messages and icons in the light theme, on Surface, Raised or Foundation Base | Tints or shades (hover underlines instead); text on any grey; text or thin lines in the dark theme (until TODO(DARK_TOKENS)); headings, decoration, main actions; red with yellow in stripes, gradients or shell shapes (Shell trade dress) |
| Link blue | Links; checked check boxes, radios and switches (`--blue`) | Buttons, headings, tints, large areas |
| Text Strong | All text and icons; inverse fills: the mark, avatars, the banner, tooltips, count badges, the chosen segment, today in calendars | – |
| Colours outside the palette (blue, green, amber, purple, teal, magenta, slate) | Meaning only: feedback, status families, planning levels, team dots, charts — always next to a word | Buttons, headings, backgrounds of whole areas; anything that resembles Primary Yellow or Secondary Red |
| Greys of the palette | Everything else | – |

### 3.2 Typography

| Token | Value | Use |
|---|---|---|
| `--font` | `Arial, Roboto, Helvetica, sans-serif` | All body and interface text: labels, inputs, buttons, tables, menus. Shell's own body stack; Arial's digits are equal width, so money columns line up. |
| `--font-heading` | `'Jost', Arial, Roboto, Helvetica, sans-serif` | Headings, the product name and summary-card values. Jost 600 and 700, Latin subset, self-hosted from `@fontsource/jost` 5.3.0 (SIL Open Font License 1.1); no font is loaded from the internet. It stands in for Shell's proprietary heading typeface (§12). |
| `--weight-regular` / `--weight-bold` / `--weight-heading` | 400 / 700 / 600 | Arial uses 400 and 700 only; Jost uses 600 and 700 |

**Type scale** — seven sizes.

| Token | Size / line height | Family and weight | Use |
|---|---|---|---|
| `--text-xs` / `--leading-xs` | 12 / 18 | Arial 400; 700 for table headers, chips, tags, badges | Breadcrumb, table headers, chips and tags, count badges, captions, timestamps, the footer, the banner. Never below 12 px. |
| `--text-sm` / `--leading-sm` | **14 / 20** | Arial 400; **700** for buttons, field labels, stand-alone links, emphasis | **Default**: body, table cells, inputs, hints, notes, errors, menu items, sidebar items |
| `--text-md` / `--leading-md` | 16 / 24 | Jost 600 for card titles; Arial 700 for sub-sections | **Card titles** (H2); sub-section headings (H3) inside a card or panel; lead text; input text below 600 px (stops phone zoom) |
| `--text-lg` / `--leading-lg` | 18 / 24 | Jost 600 | Dialog, side-panel and form-section titles; the product name in the top bar |
| `--text-xl` / `--leading-xl` | 20 / 28 | Jost 600 | Section headings between cards, empty-state titles; the page title below 600 px |
| `--text-2xl` / `--leading-2xl` | 28 / 36 | Jost 700 | **Page title (H1)**; summary-card values (tabular figures) |
| `--text-3xl` / `--leading-3xl` | 32 / 40 | Jost 700 | The Home greeting only |

Rules:

- **Weights:** Arial 400 and 700 only (Arial has no real 600; a requested 600 renders as faux bold or as
  700 depending on the browser); Jost 600 and 700 only.
- **Sentence case everywhere**; no upper-case labels, eyebrows or tags; `letter-spacing: normal`.
- Headings and body share `--ink`; hierarchy comes from size, weight and family, not colour.
- **Every heading below the page title is `SectionHeading`** (`ui/SectionHeading`, D-418), one look per rank:
  `section` 20/28 Jost 600 (between cards), `panel` 18/24 Jost 600 (dialog, side-panel, form-section and
  page-section titles), `card` 16/24 Jost 600 (card, report-widget and builder-panel titles; `Card` uses it),
  `sub` 16/24 Arial 700 (a sub-section inside a card or panel), `label` 14/20 Arial 700 (a small group: a list,
  a legend, a preview). The level (`h2`–`h4`) follows the outline, never the look; a feature never styles a
  heading of its own. A sub-section inside a form card (`sub` or `label`) takes `divided`: a hairline under it, the
  content's width; a card's own header has the full-width hairline instead. Weights are always the `--weight-*` tokens, never a number.
- Numbers in tables, totals, money and summary values use `font-variant-numeric: tabular-nums`.
- Text is never smaller than 12 px; long reading text (help, descriptions) is 14 px or more.

### 3.3 Spacing

Shell's 4 px grid; the number in the token is the multiple of 4. Only these steps exist; the single
exception is 1–2 px for borders and focus offsets.

| Token | `-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-7` | `-8` | `-9` | `-10` | `-11` | `-12` | `-14` | `-16` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `--space-*` (px) | 4 | 8 | 12 | 16 | 20 | 24 | 28 | 32 | 36 | 40 | 44 | 48 | 56 | 64 |

| Situation | Value |
|---|---|
| Label to control (or label to hint, hint to control) | 8 (4 between label and hint) |
| Control to its note or error | 4 |
| Between fields | 20 |
| Between form sections / sections of a panel | 32 inside one card; 20 between section cards |
| Card padding | 24 (16 below 600 px); summary cards 20 |
| Card header to body; between children of a card | 16 |
| Between cards in a grid | 20 |
| Breadcrumb to title · title to meta row · title to description | 8 · 8 · 4 |
| Page header to content | 24 |
| Between controls in a toolbar or button group; icon to text | 8 |
| Table cells | 8 vertical × 12 horizontal (first and last cell 24 horizontal, aligned with the card padding) |

### 3.4 Corner radius

| Token | Value | Objects |
|---|---|---|
| `--radius-1` (= `--radius-chip`) | 4 px | Status chips, level and team tags, filter chips, field markings, tooltips, menu items, checkboxes |
| `--radius-2` (= `--radius-control`, `--radius-card`) | 8 px | Buttons, inputs, selects, search fields, segmented filters, menus, popovers, toasts, inline alerts, the table outline, **cards and summary cards** |
| `--radius-3` (= `--radius-dialog`) | 12 px | Dialogs |
| `--radius-4` | 16 px | The sign-in card only (kept for parity with Shell's scale) |
| `--radius-pill` | 999 px | Avatars, count badges, progress bars and switches **only** — no pill-shaped buttons, tabs, search fields or chips |

Side panels and the drawer are square (they touch the window edge).

### 3.5 Elevation

| Level | Token | Light | Dark | Objects |
|---|---|---|---|---|
| 0 | `--shadow-sm` | none | none | Cards: flat, with a 1 px `--card-border` on the grey page |
| hover | `--shadow-lift` | `0 4px 12px rgba(0,0,0,.12)` | `0 4px 12px rgba(0,0,0,.45)` | Hover on clickable cards only; the card does not move |
| 1 | `--shadow-md` | `0 2px 8px rgba(0,0,0,.16)` | `0 2px 8px rgba(0,0,0,.5)` | Menus, popovers, tooltips, toasts |
| 2 | `--shadow-lg` | `0 4px 24px rgba(0,0,0,.2)` | `0 4px 24px rgba(0,0,0,.6)` | Dialogs, side panels, the drawer |

Sticky bars (top bar, table header, form footer) use a 1 px `--hairline` border, not a shadow.

### 3.6 Control heights and icon sizes

| Token | Value | Used for |
|---|---|---|
| `--control-sm` | 32 px | Every control of a list toolbar (search, segmented filters, selects, filter buttons, Filters (n), chips — D-421), controls inside tables and card headers, the ⋯ of a table row |
| `--control-md` | **40 px** | **Default** for buttons, form inputs and selects, page-header actions, menu items, sidebar items, table rows |
| `--control-lg` | 48 px | Sign-in, form inputs and form-footer buttons below 600 px, tabs |
| `--icon-sm` | 16 px | Icons in `sm` controls, chips, rows and chevrons (D-418) |
| `--icon-md` | 20 px | Icons in `md` controls, the sidebar and the top bar (D-418) |

Icons are 16 px in `sm` controls and chips, 20 px in `md` controls, the sidebar and the top bar, and 48 px
in empty and error states. Controls next to each other always use the same size. Every clickable target is
at least 24 × 24 px (WCAG 2.5.8); small icons (ⓘ, chip ×, clear search) get a 24 px target around a 16 px
icon.

### 3.7 Page widths and layout sizes

| Token | Value | Token | Value |
|---|---|---|---|
| `--content-max` | 1300 px | `--topbar` | 56 px |
| `--form-max` | 720 px | `--sidebar` / `--sidebar-collapsed` | 240 / 64 px |
| `--form-page` | 960 px | | |
| `--gutter` / `--gutter-sm` | 24 / 16 px | `--grid-gap` | 20 px |

Component sizes (written in the component's CSS until a second component needs them as a token): banner
32 px; drawer 280 px; side panel 480 px (560 px wide variant); dialog 512 px (720 px wide
variant); menus 220–288 px; tooltip max 280 px; popover max 320 px; toast 360–480 px.

Breakpoints (§2.2) are 600, 960 and 1280 px; CSS cannot read tokens inside media queries, so the lint rule
of §3.12 allows only these widths.

### 3.8 Motion

One duration `--dur` 250 ms (Shell's animation time) with `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`
for panels, menus, toasts and hover colours. Menus and popovers fade in with an 8 px move; side panels slide
from the right; toasts slide up. Nothing moves on hover. **With reduced motion: no movement, no fades, no
shimmer** (`global.css`).

### 3.9 Icons

One outline set: `lucide-react` (ISC licence), stroke 2, `currentColor` (`--ink` or `--ink-2`), sizes of
§3.6. Icons never carry meaning alone: an icon-only button has an accessible name and a tooltip (§9).
No filled icons, no photography in working screens, no consumer graphic devices (sparkles, halftone dots,
chevron crops).

### 3.10 Logo and brand assets

- **The name is the logo** (feature 035, D-332, constitution X): "SP&A One" in Jost 600 (18 px `md`, 20 px
  `lg`), no symbol beside it. "SP" and "A" `--ink`; "&" `--brand-name-amp` (`#003C88` light, 10.49 on
  Surface · `#6F9BD1` dark, 5.05); "One" `--brand-name-one` (`#AD8700` light — Primary Yellow's hue darkened,
  3.36 on Surface, 3.09 on Foundation Base · Primary Yellow `#FFC600` dark, 9.23). These are the only text
  in yellow or a yellow shade; they never mean "act here". The sign-in title writes the name the same way
  (`ProductName`, at the title's size). Screen readers hear one name, "SP&A One".
- **`LogoTile`** where the name does not fit (the top bar below 960 px) and as the favicon: a 28 px tile,
  radius 8, `--brand-tile` (`#003C88`) with a "1" in `--on-brand-tile` (`#FFC600`, 6.65 on the tile), the
  same in both themes. No gradient. The star mark of versions 1–2.2 is retired.
- **No Shell pecten, no "Shell" wordmark, no Shell typeface, no red-and-yellow shell shapes or stripes**
  until Shell gives trade-mark consent and artwork approval (§12). The word "Shell" may appear as plain
  text where it describes the business ("Shell attributes").
- If Shell approves the pecten later, it replaces the tile exactly as Shell places it (symbol only, full
  colour, top-left, linking home), following Shell's clear-space and minimum-size rules.

### 3.11 Dark mode

Built on Shell's dark palette (constitution X): a `#1C1C1C` page, `#292929` cards and panels, `#343434`
menus and dialogs, the same yellows with dark text, red only as a fill, and a Text Strong focus ring.
In menus and dialogs secondary text is Text Strong (§3.1). Values marked TODO(DARK_TOKENS) keep the
earlier dark values until Shell supplies them. It follows the computer's setting first, then the
person's choice in the account menu (D-038). Every pair in §3.1 and §4 passes AA in both themes.

### 3.12 Token rules

- No raw colour, font size, font weight, line height, radius, shadow, control height or spacing value in a
  component's CSS: only `var(--token)` (1–2 px borders and focus offsets, and the component sizes of §3.7,
  excepted).
- Media queries use only `max-width: 599px`, `min-width: 600px`, `max-width: 959px`, `min-width: 960px`,
  `min-width: 1280px`, `prefers-reduced-motion`, `prefers-color-scheme`, `forced-colors` and
  `hover`/`pointer`.
- A stylelint configuration enforces both (implementation plan, phase 1).

---

## 4. Status, level and money colours

### 4.1 Status families (status colour meanings)

Status is always **word + colour (+ icon where space allows)**; colour is never the only signal. **Each word
belongs to exactly one family, and the same word never appears in two colours** (§11, rule 6). One mapping
in code (`lib/statusTone.ts`) is the only place a word gets its family.

| Family (token name) | Meaning | Words | Dot (light / dark) | Chip text light (on its 12 % tint) | Chip text dark (on its 12 % tint) |
|---|---|---|---|---|---|
| **Neutral** (`--status-neutral`) | Not started, nothing to do yet, switched off | Draft, Created, Not started, No activities, Not requested, Inactive | `#6E6E6E` / `#8E99A4` | `#595959` (6.04) | `#B0B8C1` (6.00) |
| **Waiting** (`--status-review` = warning) | Someone must decide or check; also non-blocking warnings | Submitted, Waiting for approval, Partly approved (n of m approved), Waiting for activity approval | `#C77700` / `#E09A2A` (amber — never brand yellow) | `#8F5400` (5.36) | `#F0A640` (5.74) |
| **Positive** (`--status-positive` = success) | Agreed, published, complete and correct | Published, Approved, All approved, All filled in, Active (Settings records, people), Ready to send to GSAP | `#008557` / `#3DBB8C` | `#00704A` (5.22) | `#4CC79A` (5.61) |
| **Running** (`--status-active` = info) | Approved and under way in time | In progress (activity running), Running | `#336094` / `#6F9BD1` | `#2B5482` (6.56) | `#8FB4E3` (5.63) |
| **Done** (`--status-done`) | Finished | Complete, Finished | `#5B6B7A` / `#8696A6` | `#4D5C6A` (5.86) | `#A9B8C6` (5.98) |
| **Problem** (`--status-problem` = danger) | An error or something that blocks the next step | Declined, *n* fields needed, *n* items below need attention, over-allocated budget, negative balance, failed | `#DD1D21` / `#FF5C5F` | white on a `#DD1D21` fill (4.92) | white on a `#DD1D21` fill (4.92) |

All chip texts also pass on white and on grey (≥ 5.6 light) and on the dark page and surface (≥ 6.7).
Red is never tinted (constitution X), so the problem chip is a Secondary Red fill in both themes.

- "In progress" is used **only** for a running activity. The approval roll-up of plans, campaigns and
  initiatives is written "Partly approved" or "2 of 4 approved" (functional review A-02; product-owner
  confirmation listed in the implementation plan).
- Amber is the attention colour; red is reserved for danger and errors (product-owner decision 5,
  D-314). Yellow never marks a status.
- A row shows **at most two chips**: its status and one problem chip; anything else goes into the problem
  chip's popover.

### 4.2 Level colours

A 4 px bar beside the name in trees and the level tag's border. The level is always written in the tag.

| Level | Light | On white · grey | Dark | On surface |
|---|---|---|---|---|
| Plan | `#003C88` Shell dark blue | 10.49 · 9.62 | `#6F9BD1` | 5.49 |
| Campaign | `#87217D` Shell purple | 8.26 · 7.57 | `#C96BBF` | 4.78 |
| Initiative | `#008192` Shell teal | 4.61 · 4.23 | `#3FB6C5` | 6.57 |
| Activity | `#A3195B` magenta | 7.38 · 6.76 | `#E06A9F` | 5.08 |
| Line item | `#6E6E6E` grey | 5.10 · 4.68 | `#8E99A4` | 5.46 |

Purchase requests and PR lines (032) are not planning levels; their tags (PURCHASE REQUEST, PR LINE) use the
line item's grey, so no new colour is introduced.

Levels never use yellow (yellow means "act here" or "you are here"), nor the green of "positive" or the
amber of "waiting". Level marks are outlined tags and bars; status marks are filled tinted chips, so the two
never look alike.

### 4.3 Team colours

The decorative dot of a team tag (the name is always written, D-025). Token names are stored data and do
not change; the values are unchanged from version 1 and the same in both themes: `--team-blue` `#2A78D6`,
`--team-violet` `#6E56CF`, `--team-teal` `#12A594`, `--team-magenta` `#D6409F`, `--team-orange` `#E5701A`,
`--team-green` `#2F9E44`, `--team-slate` `#5B6B7A`, `--team-gold` `#8B6914` (darker since feature 020, so it never reads as Primary Yellow). Because the dot is decoration
next to the written name, it has no contrast requirement.

### 4.4 Money and numbers

- **Right-aligned with tabular figures** in tables, totals and editable amount cells; the column header is
  right-aligned too, with the same padding, so values sit exactly under it (§11, rule 2).
- **Symbol form for every currency** (en-US symbols: $, €, £, CA$, CN¥…), always two decimals ("$12,500.00",
  "€12,500.00", "£50,000.00"; compact "$1.25M", "€1.25M" in summary cards with the full value on hover and
  focus); the code form is no longer used for amounts (D-413). Rates keep codes ("1 USD = 0.75 GBP").
- Negative values in `--danger-text` with a minus sign ("−$500.00"); never only red.
- **Nothing is "—"**: an empty amount, a missing value and "no activities yet" show "—", never 0 or
  "$0.00"; a short reason may follow in `--ink-2` ("— · Nothing planned yet").
- Percentages without a space: "38%" (UK style); shares in the split editor "33.33%".
- Whole numbers grouped: "1,250".
- **An amount in another currency than the reader's** (feature 016, D-418) shows as one `ConvertedAmount`
  (`features/line-items`, exported for every feature): the amount in its own currency in full, then a muted
  12 px "≈ $7,000.00" in the display currency, stacked or `inline`, both red with `problem`. The converted
  amount is a `Tooltip` reachable by pointer, keyboard and touch that names the rate the API reports and its
  date ("In USD at today's rate (1 USD = 0.75 GBP · rate of 12 Nov 2026 · GSAP import)"); screen readers hear
  "about $7,000.00". One amount only, and no tooltip, when both currencies are the same. `Converted` is the
  "≈" part alone, under a summary-card value or in a row.
- **Grids add up in every display currency** (feature 038 FR-022): a row total is converted once and its
  months share it, the last month with an amount taking the rounding difference; column and grand totals are
  sums of the converted cells. A separately converted summary figure may differ by a cent (D-061).

### 4.5 Dates and times

- **One date format: the person's choice** (default `DD MMM YYYY`, "12 Mar 2026"), in text **and in date
  fields** (§5.5 `DateField`, `DateRangeField`). Ranges follow D-216 ("01 Mar – 31 May 2026"; "Ongoing from 01 Mar
  2026").
- Times are 24-hour: "14:05"; date and time: "12 Mar 2026, 14:05".
- All dates go through `lib/format.ts` (`useFormatters()`); no component formats a date itself.

### 4.6 Progress bars and bar lists

`ProgressBar`: 8 px high, radius 4, track `--ink` at 14 % over `--surface`, fill `--info`; fill `--danger`
above 100 % (the fill stops at the end, the real percentage is written and announced). The value is always
written next to the bar ("38% used"). `busy` (D-418): work with no known end, the fill travels along the
track (still under reduced motion), no value announced; the words beside it say what is happening.

`BarList` (`ui/BarList`, D-418) — the one horizontal bar list (report status mixes, sign-in bands, waiting
bands, attribute values, how long approvals have waited): one row per item, 32 px high — the label (wraps,
never truncated), the bar on `ProgressBar`'s track, then the figures in words, right-aligned and tabular
("4 · 25 % · $12,000.00"); the bar alone never carries a value. Bars are measured against the largest item,
or against `max` (100 for shares). Fills are chart tokens only (§4.7; `--chart-planned` by default,
`--chart-budget` for "Not filled in", "Never" and other quiet values), never yellow or red. A row with an
address is one link (the label's link covers the row, hover `--hover-on-card`, a 16 px chevron); the list is
named ("People by last sign-in"). The stacked bars of the purchase-request commitment chart use the same
track.

### 4.7 Charts (feature 036)

Charts are bars drawn from the API's figures (ADR-0017), each with a legend in words, a text summary for
screen readers and a **Table** view that lists the same figures. Series colours are tokens outside the
palette, never yellow or red, each ≥ 3:1 on its surface:

| Token | Series | Light | Dark |
|---|---|---|---|
| `--chart-budget` | Budget | `#5B6B7A` | `#8696A6` |
| `--chart-planned` | Planned cost | `#336094` | `#6F9BD1` |
| `--chart-committed` | Committed | `#008192` | `#3FB6C5` |
| `--chart-actual` | Actual (paid) | `#008557` | `#3DBB8C` |

The Dashboards page (`/dashboards/executive`, `/dashboards/regional`) is a list template (§2.4): page header
with **Export** (PowerPoint, PDF) as a secondary menu, Executive and Regional tabs, the filters in a row,
then summary figures, tables, the monthly chart and the panels in cards. Exported files use the same tokens'
light values with Text Strong text on white.

**Custom dashboards (feature 051, ADR-0020).** Charts people build are drawn with Apache ECharts from the API's
figures, with the same rules: a legend in words, a text summary, **Show as table**, patterns (decals) on bars,
areas and slices so colour never carries meaning alone. A widget's colours come from one of four palettes, never
from a free colour choice:

| Palette | Tokens | Light | Dark |
|---|---|---|---|
| Categorical (default) | `--chart-cat-1` … `--chart-cat-8` | `#003C88` `#008192` `#87217D` `#008557` `#A3195B` `#336094` `#5B6B7A` `#6E6E6E` | `#6F9BD1` `#3FB6C5` `#C96BBF` `#3DBB8C` `#E06A9F` `#8FB4E3` `#8696A6` `#8E99A4` |
| Planning | `--chart-budget`, `--chart-planned`, `--chart-committed`, `--chart-actual`, then `--chart-cat-5` … `-8` | as above | as above |
| Levels | `--level-plan` … `--level-line-item` (§4.2) | §4.2 | §4.2 |
| Sequential (heatmaps) | `--chart-seq-1` … `--chart-seq-5`, light to strong | `#C9D8EA` `#93B1D6` `#5E8AC1` `#336094` `#003C88` | `#1F3A5C` `#2B5482` `#4B78AA` `#6F9BD1` `#A9C6EA` |

Each Categorical colour is ≥ 3:1 on its surface; after eight series the colours repeat with other patterns. Heatmaps
use five bins, each exactly one Sequential token (no interpolated tints), named in the legend. Chart text is Text
Strong and Text Subtle, axes and gridlines Border Subtle; tooltips are Raised with Text Strong. The **Dashboards**
page (`/dashboards`) is a list template (§2.4) with Built-in, My dashboards and Shared with me card sections; a
custom dashboard (`/dashboards/:id`) is a list template with the filters bar and a 12-column grid of widget cards
(80 px rows, 16 px gaps; one column below 960 px). The **builder** (`/builder`) is a full-width editor: page header
with Undo, Redo, Sharing, View and the one yellow **Save**; the widget palette (240 px) on the left, the canvas on
the grey page, the inspector (360 px) on the right; the selected widget has the focus ring and the 4 px yellow bar
on its top edge.

---

## 5. Components

Every shared component lives in `frontend/src/components/` and is imported from `@/components`. Features
reuse them instead of styling their own (FR-019, D-197). Sizes are in px; tokens are in §3 and §4. Unless a
row says otherwise, every interactive component shows the focus ring (2 px `--focus-ring`, 2 px offset),
has a 24 × 24 px minimum target and works with the keyboard alone. Components marked **new** are added
in version 2.

### 5.1 Actions

**`Button` and `LinkButton`**

| | Spec |
|---|---|
| Sizes | `sm` 32 high, padding 0 12, icon 16 · `md` 40, padding 0 16, icon 20 · `lg` 48, padding 0 20, icon 20. Text 14/20 Arial 700; icon 8 px before the label; icon-only buttons are square (32 / 40 / 48) and need `aria-label` plus a `Tooltip`. Radius 8. |
| `primary` | `--button-primary-bg` fill and border, `--button-primary-text`; hover `--button-primary-bg-hover`, pressed `--button-primary-bg-pressed`. **The page's or dialog's one main action** (§11, rule 1). |
| `secondary` | `--surface` fill, 1 px `--control-border`, `--ink` text; hover `--hover` fill and `--control-border-hover`; pressed `--chip`. Every other button, including Cancel. |
| `ghost` | Transparent, `--ink` text; hover `--hover`; pressed `--chip`. Icon buttons in headers and tables, "Collapse sidebar". |
| `danger` | `--danger-bg` fill, `--on-accent` text; hover underlines the label (red has no hover shade). **Only** as the confirm button of a destructive `ConfirmDialog`; it then is that dialog's single main action. Elsewhere destructive actions are menu items (§6.1). |
| Busy | A spinner replaces the icon, `aria-busy="true"`, the label stays, a second click is ignored. Never greyed out. |
| Unavailable | Avoid. The button stays enabled and explains on click (§6.6); if truly disabled: `disabled` or `aria-disabled`, the Disabled tokens (`--disabled-bg` fill, `--disabled-text` text, `--disabled-border` border; no fading), a `LockedNote` beside it. |
| Words | A verb naming the action, sentence case: "Create campaign", "Submit for approval" — never "OK", "Yes" or "Submit". |

**`ActionsMenu`** (the ⋯ menu)

- Trigger: ghost icon button, `sm` in table rows and panel headers, `md` in the page header; named
  "Actions for <record>", with a tooltip.
- Menu: 220–288 wide, `--surface`, radius 8, padding 4, `--shadow-md`. Items 40 high, padding 0 12, text
  14, optional 16 icon, radius 4; hover and keyboard focus `--hover` (plus the focus ring for the keyboard); optional hint line 12 `--ink-2`, Text Strong while the item is highlighted.
- Order: View · Edit · Duplicate / Copy to… / Move to… · record-specific actions · View history · then a
  1 px `--hairline` separator and **Delete** last in `--danger-text`; highlighted, it becomes a `--danger-bg` fill with white text.
- Not modal; arrow keys move, Enter chooses, Escape closes and returns the focus to ⋯; the chosen action
  runs after the menu has closed. No tooltips inside a menu (research R14).
- Built on `Menu` (below), like every dropdown menu.

**`Menu`** (`ui/Menu`, D-416) — the one dropdown menu: Saved views, Export, the account menu, ⋯.

- Radix DropdownMenu, never modal. `Menu.Content` portals onto the **floating surface** shared with
  `Popover`: `--raised`, 1 px `--card-border`, radius 8, `--shadow-md`, padding 4, 220–340 wide, at most
  480 px (or the window less 120 px) high, then it scrolls; in the dark theme Text Subtle inside it is Text
  Strong (Raised is 3.9:1). Defined once in `ui/Popover/floating.module.css`.
- `Menu.Item` as in **ActionsMenu** (40 high, radius 4, optional 16 px icon, `hint`, `tone="danger"`,
  disabled with its reason); `onChoose` runs once the menu has closed and the focus is back on the trigger,
  so a dialog it opens returns the focus there. `Menu.Choice` ticks the current one of several (a saved
  view, `menuitemcheckbox`). `Menu.Separator` (1 px `--row-divider`), `Menu.Note` (12 px `--ink-2`: "No
  saved views yet", a reason) and `Menu.Label` (who is signed in) complete it.
- Features never style a menu surface or item; a needed variant is added to `Menu`.

**`SavedViewsMenu`** (`ui/SavedViewsMenu`, D-418) — the **Saved views** menu of All work and of every report:
the views first (the active one ticked, a `Tag` "Default" on the default view, "Modified" on the button while
the address differs from the view), then a separator and the actions (Save view, Manage views…). Features
pass their views and actions; they never build the menu.

**`SaveViewDialog`** (`ui/SaveViewDialog`, D-423) — Save current view or filters: **Name** (required, at most 60
characters, checked on Save) and a default check box whose words the page gives. A name the person already uses
(any letter case) asks "Replace your view '<name>'?" first. Features pass `create` and `replace`, which call
their API; the dialog shows the API's field problems at the name, and "View '<name>' saved" or "updated".

**`ManageViewsPanel`** (`ui/ManageViewsPanel`, D-423) — the `SidePanel` "Your saved views": per view the name
with a "Default" `Tag`, then the default action, **Rename** (a **Rename view** dialog with the same name rules,
refusing another view's name) and **Delete**, each named with the view. The default action is **Set as
default** / **Remove default**, or with `star` one **Default** toggle (`aria-pressed`, star icon) on reports.
With `deleteQuestion` a delete asks first ("Delete view '<name>'?", red **Delete view**); without it the view
goes at once and the panel closes. Either way the message offers **Undo**, which saves the view again with its
default. A view deleted in another tab says so. Features pass `changes` (change, remove, restore).

**`ExportMenu`** (`ui/ExportMenu`, D-416) — **Export** everywhere (All work, reports, report widgets,
planning dashboards). Props: `formats` (Excel, CSV, PowerPoint, PDF, in the order given), `download`,
`label`, `size` (`md`, reports `sm`), `iconOnly` (a widget's download icon, named by `label`).

- One format downloads at once; several open a `Menu` of formats.
- While the file is made the button reads "Preparing your file…" with a spinning icon and `aria-busy`; a
  message then names the saved file ("Exported '…'") or gives the API's reason.
- `refusal`: without the export permission the button stays visible but disabled, its reason as its
  description and tooltip (014 FR-011). `emptyText`: with nothing to export, choosing a format says so.

### 5.2 Navigation and filtering

**`PageHeader`** — the layout of §2.3. Props: `breadcrumb` (items), `title`, `meta` (level tag, chips, ID,
owner, dates), `description`, `actions` (`more`, `secondary`, `primary`); the `eyebrow` and `highlight` props
of version 1 are removed. It renders the page's only `<h1>`, reserves the breadcrumb row on every page and
accepts at most one primary action (a second one is a development-time error).

**`Breadcrumb`**

- 12/18, items 8 apart with a 12 px chevron (`--muted`, hidden from screen readers); links and the
  current page in Text Strong, because the breadcrumb sits on the grey page (§3.1); links underlined on
  hover and focus, each with a 24 px tall target; the current page not a link,
  `aria-current="page"`; `nav aria-label="Breadcrumb"`.
- Shown on every page below the top level; its row is reserved on every page (§2.3).
- Below 600 px only "‹ <parent>" (a 16 px chevron and the parent's name) — never wraps to two lines.
- More than 4 steps: middle steps collapse into "…" with a menu.

**`Tabs`** (new; replaces `PillTabs`, which stays as an alias until every use moves)

- Tab height 48, text 14, 24 between tabs, no fill; the list has a 1 px `--hairline` bottom border.
- **Selected tab: bold text and a 4 px `--brand-yellow` bar on its bottom edge** (Shell's "you are
  here"); `aria-selected="true"`. Hover: text underline.
- Counts after the label: "Activities (12)", or a `CountBadge` for things to act on.
- ARIA `tablist` / `tab` / `tabpanel`, one tab in the tab order, ← → Home End move and show.
- Too many tabs for the width: the list scrolls sideways with fade edges; tabs never wrap (UI audit AP-04).
- Page-section tabs keep the chosen tab in the address.

**`SegmentedFilter`** (status, level or layout of a list)

- Joined buttons 32 high, text 14, padding 0 12; one 1 px `--control-border` around the group, radius 8 on
  the outer corners, 1 px dividers between buttons; no pill shape.
- Chosen: a quiet ink tint (`--ink` at 14 % over `--surface`) and bold `--ink` text; `aria-pressed="true"`.
  Its borders stay the group's (a strong border overlapped its neighbours and drew a bright seam in the dark
  theme, D-421). Others: `--surface`, `--ink`; hover `--hover-on-card`. A chosen choice never outweighs the
  title it sits under.
- No counts in a list's status filter (the result count says how many, D-421); a `count` stays for a choice
  that names something to act on ("Edited 3"). Order and default for record states: **Active · Inactive ·
  All**, default Active; for workflow states: **All · Draft · Published**, default All.
- Below 600 px the group scrolls sideways; it never wraps.
- An option with an `icon` shows the 16 px icon alone in a 32 × 32 button named by its label, with the label
  in a `Tooltip` (D-418).

**`ViewSwitch`** (`ui/ViewSwitch`, D-418) — **Chart · Table** on every chart's card (report widgets, the
planning dashboards' monthly chart): a `SegmentedFilter` of two icon options named "Chart" and "Table", the
group named "Show <title> as", the chosen one `aria-pressed`. Custom-dashboard widgets keep **Show as table**
in their ⋯ menu.

**`Pager`** (one for every paged table, D-415) — "1–50 of 120" (or "No rows") on the left; **Rows per page** (`Select`)
and icon-only **Previous page** / **Next page** on the right; the buttons are left out when everything fits on
one page, and Rows per page where the page size is fixed. Placement: `below` a table (16 above) or `cardFooter`
(padding 12 and the card's side padding, a hairline above); with neither it sits in its parent's gap. Every pager
where people choose the page size offers one set, `PAGE_SIZES` in `ui/Pager`: 25 · 50 · 100 · 200, opening at
50 (`DEFAULT_PAGE_SIZE`), lists and reports alike (D-432).

**`SearchField`**

- 40 high in forms and panels, **32 (`size="sm"`) in every list toolbar** (D-421); radius 8 (never a pill),
  1 px `--control-border`, `--surface`; 16 px magnifier at 12 from the start; text 14 (16 below 960 px) from
  36; width 280–360 in toolbars.
- `delay` (ms): a list that asks the server reports the text after a pause (Plans 250, others 300), or at once
  when the box loses the focus, and shows a search set elsewhere (Clear filters, Back) over what was typed.
- The placeholder says what it searches ("Search name or ID"), `--muted`; the accessible name is a
  hidden label ("Search plans").
- **Clear search**: 16 px ✕ in a 24 × 24 target at the end, once something is typed; focus returns to the
  input.
- Hover border `--control-border-hover`; focus ring. The list shows the result count next to it.

**`FilterChips`**

- A chip per filter in use: 32 high, padding 0 8 0 12, `--chip` fill, `--ink` 12/18 bold, radius 4,
  16 px ✕ in a 24 × 24 target; the whole chip is the button "Remove filter: Status: Draft".
- **Clear filters**: ghost `sm` button after the chips, the one wording on every list (no "Clear all", no
  "Reset filters", D-421); it clears what the chips show and keeps the quick control. Nothing shows while no
  filter is in use.

**`FilterMenuButton`** (`ui/FilterMenuButton`, D-416) — the button of one filter in a filter bar: 32 high,
padding 0 8 0 12, radius 8 (like `Select` and `SegmentedFilter`), 1 px `--control-border`, `--surface`, 14 px
`--ink`, a 16 px chevron that turns while open. While the filter is in use: a `--control-border-hover`
edge and its summary after a middle dot in bold — how many values are chosen ("Owner · 2") or the one
chosen ("Years · 2026"); the summary is part of the button's name. Hover `--hover`.

**`FilterMenu`** (`ui/FilterMenu`, D-416) — one filter of a filter bar: a `FilterMenuButton` opening a
`Popover` (300 wide) of check boxes, or radio buttons for one value; a change applies at once. Inactive
values say "(inactive)"; a chosen value no longer offered stays listed so it can be removed; above 10
choices a search box; group headings; an optional first choice that ticks several (Team's "My teams").
Used in every `FilterBar`'s menus (D-421). A filter bar holds **only** `SearchField`, `SegmentedFilter`, `Select` (one value from a
short list: Year, Plan, Person, Sort), `FilterMenu` or `FilterMenuButton` + `Popover` (several values, or
a few fields: Years, More filters), `DateField compact` and the result count — never a native `<select>`.

**`FiltersButton`** (`ui/FilterMenuButton`, D-417) — the **Filters (n)** button that folds the filter menus out
or away: a secondary `sm` (32) `Button` with a sliders icon, "Filters" or "Filters (2)", `aria-expanded` and
`aria-controls` naming the row; below 600 px a square icon button with the number in use on an ink badge, the
words staying its name.

**`YearRangeMenu`** (`ui/YearRangeMenu`, moved from All work, D-421) — the **Years** filter: a
`FilterMenuButton` ("Years · 2026–2027") opening From and To `Select`s; choosing a From moves To along; an
optional first From choice clears the range ("All years", Plans) and an optional most-years limit with its note
(All work, 5).

**`DateRangeMenu`** (`ui/DateRangeMenu`, D-421) — a date-range filter ("Submitted", "Created", "Dates"): a
`FilterMenuButton` ("Created · 01 Oct 2026 – 12 Oct 2026") opening From and To `DateField compact`, each applied
at once and linked: From's calendar takes no day after To, To's none before From (D-424); a range error shows
under To and leaves the button without a summary.

**`FilterBar`** (`ui/FilterBar`, D-421) — **the one list toolbar**, composed by every list (Plans, Approvals, All
work, the reports, Purchase requests, the activity log, Financials, the recycle bin, the performance lists and,
through `ListToolbar`, Settings, People and Teams). Left to right: `search` (`SearchField size="sm"`) · `quick`
— the page's one always-shown control, if it has one (a status `SegmentedFilter`, the reports' Year, Purchase
requests' view; Financials' Year and Plan) · **Filters (n)** · then `end`, pushed to the right: the
`ResultCount` and the page's view switches (Plans' Cards · Table, Purchase requests' Sort). Every other filter
is in `menus`, the row Filters (n) folds out (`role="group"` named "Filters"): one `FilterMenu` per filter
(check boxes for several values; radio buttons for one, with an "Any …" first choice), `YearRangeMenu`,
`DateRangeMenu`, and **More filters** (`ui/AttributeFilterMenu`, D-424: every Shell attribute by level, its values
and Not filled in as check boxes, searchable) for the Shell attributes; each change applies at once, no Apply button. The
row folds out by itself when the page opens with a filter in use, or when one comes into use from elsewhere (a
summary card's link); (n) counts the filters behind the button, not the search or the quick control. A list
with no filter behind the button has no Filters (n). Below the row: the `FilterChips` with Clear filters, and
an optional note ("You can still open every plan."). Every control is 32 px. Below 600 px the row wraps and
Filters (n) is the icon with its badge. **State:** every filter, the search and the quick control live in the
page address and are written in place (`replace`), so Back leaves the list instead of undoing the filters one
by one, and a reload or a link keeps them (constitution IX, D-421). Pages read and write the address only through
`ui/useAddressParams` (lint-enforced): each change applies to the latest address, so two quick changes both
survive (D-424).

**`Popover`** (`ui/Popover`, D-416) — every panel that floats from a button and is not a menu: filter
menus (each `FilterMenu`, `YearRangeMenu`, `DateRangeMenu`), a date field's calendar, a busy day's activities, the completeness problems, the
notifications, a `Combobox`'s list. Radix Popover; `Popover.Content` on the floating surface (see `Menu`) with
`width` `auto` (220–340), `sm` 260, `md` 300, `lg` 360 or `anchor` (its control's width, at least 240) and `padding` `none`, `sm` 4, `md` 8 or `lg` 16 (fields). The
focus moves into it, Escape or a click outside closes it and the focus returns to its button. Features
style only what is inside it.

**`ResultCount`** (`ui/ResultCount`, D-416) — the result count at the end of a list toolbar: 14 px
`--ink-2` (Text Strong on the grey page), tabular figures, pushed to the end of the row, a row of its own
below 600 px, read out politely when it changes. Its words come from `countText(shown, total, noun)`:
"4 of 6 plans", "1 of 1 team", also when nothing is filtered out; a list that counts without "of" (Global
budgets, Purchase requests) keeps its own words in the same element.

**List toolbar** (layout rule, new)

One 32 px row, the `FilterBar` above: `SearchField` · `SegmentedFilter` · **Filters (n)** (secondary) · spacer ·
result count "4 of 6 plans" (14 `--ink-2`) · view switch · **Export** (secondary). The filter menus fold out on
the second row; filter chips below them. Every list writes its count the same way: "*n* of *m* <things>". A toolbar that sits on
the grey page instead (All work, Financials) writes its count, notes and links in Text Strong (§3.1).

### 5.3 Containers, panels and dialogs

**`Card`**

- `--surface`, 1 px `--card-border`, radius 8, padding 24 (16 below 600 px), no shadow.
- Header: at least 40 high, items **centred vertically** (title and header buttons on one centre line);
  title `<h2>` Jost 600 16/24 (`SectionHeading rank="card"`); optional subtitle 14 `--ink-2` under it; actions at the end (secondary or
  ghost `sm`/`md`). No divider line under the header; 16 px to the body.
- Cards in one row of the grid stretch to the same height. In a row, either every card has a subtitle or
  none does.
- Variants: **table card** (no body padding; the toolbar and table touch the card edges, the table's
  first and last cells keep 24 px); **link card** (the whole card is one link; hover `--shadow-lift`, no
  movement; a 16 px chevron at the top end).

**`SummaryCard`**

- `--surface`, 1 px `--card-border`, radius 8, padding 20, min height 104, no shadow.
- Three rows: label (14/20 `--ink-2`, ⓘ right after the label), value (Jost 700 28/36, tabular, `--ink`),
  detail (14 `--ink-2` or a `ProgressBar`).
- **A row of summary cards shares its row tracks** (CSS grid with subgrid), so values line up even when one
  label wraps (UI audit H-03, AW-02); labels are written to fit one line at the 4-up width.
- The value is coloured only when the colour means something: `--danger-text` for over-budget or negative,
  `--warning-text` for "waiting". Shortened values ("$1.25M") show the full value on hover and focus.
- With `to` and `linkLabel` (D-418; `LinkSummaryCard` retired) the whole card is one link named "<label>:
  <value> — <where it goes>"; hover `--hover-on-card`; a 16 px chevron at the top end; the ⓘ and a shortened
  value's button stay above the link. **No tinted icon tiles** (UI audit D-01). `tip` may be a field's own
  help tip instead of text.
- Rows: 4 per row at ≥ 960 px; pages with 5 or 6 values use 3 per row; 2 per row below 960 px; an odd
  last card spans the full row below 600 px.

**`StatStrip`** — a row of `SummaryCard`s joined into one card split by hairlines: up to five in a row, six to
ten in two even rows, two per row when its container is under 760 px (an odd last card spans the row). Values are
compact ("$650K") with the full amount on hover and focus. **Every row of figures is one `StatStrip` of
`SummaryCard`s** (D-418): every report, All work, Plans, the plan page, Home (whose four cards are one strip of
links), the Executive and Regional dashboards, the line-item form's activity summary and the line item's
Financials figures.

**`SidePanel`** (one panel layout)

- Width 480 (560 for panels with tables); full width below 600 px; full window height from the right
  edge; `--surface`, 1 px `--hairline` start border, `--shadow-lg`, `--overlay` behind it; slides in 250 ms.
- **Header** 64 high, padding 0 24: title Jost 600 18/24 (wraps; the header grows), optional description
  14 `--ink-2`; at the end the record's **⋯** (if it has actions) and **Close** (40 px icon button named
  "Close", no tooltip, R14).
- **Body** padding 24 (16 below 600 px), scrolls; details use `DescriptionList`; never a second breadcrumb.
- **Footer (the only panel footer layout)**: sticky, 72 high, padding 16 24, 1 px `--hairline` top
  border, buttons **right-aligned, 8 apart: Cancel or Close (secondary) · other secondary actions · the
  primary last**. Destructive and rare actions (Delete, Deactivate, Set inactive) are never in the footer:
  they live in the header's ⋯. Below 600 px the buttons stack full width in the same order (primary at
  the bottom, nearest the thumb).
- The component takes `primaryAction`, `secondaryActions`, `cancel` and `moreActions` props instead of
  free-form footer content, so every panel gets the same footer (§11, rule 4).
- Focus moves into the panel and stays there; Escape, Close and a click on the overlay close it (asking
  first when there are unsaved changes); the focus returns to what opened it.

**`Drawer`** (`ui/Drawer`, D-423) — a modal panel that slides in from the left (280 wide, at most 85% of the
window; `--overlay` behind it; `--shadow-lg`), named by a visually hidden title, with a 40 px close icon button
in its top right corner (named by `closeLabel`, no tooltip, R14). Focus moves in and stays inside; Escape, the
close button and a click on the overlay close it; the focus returns to what opened it. The navigation drawer
uses it.

**`FormPanel`** — a `SidePanel` with a form: footer **Cancel · Save and add another** (when creating
children) **· Save** (primary); the failure message and `FormErrorSummary` at the top of the body; "Discard
changes?" before typed values are lost. Save is never disabled.

**`ConfirmDialog`, `FormDialog` and `ClearValuesDialog`** (one dialog layout)

- Width 512 (max: window minus 32), radius 12, padding 24, `--shadow-lg`, `--overlay`; centred.
- Title Jost 600 18/24; a **Close** icon button (32 px, named "Close", no tooltip) at the top end, which
  acts as Cancel; text 14/20 `--ink`.
- Buttons 24 below the content, **right-aligned: Cancel (secondary) · the confirm button last**. Below
  600 px they stack full width in the same order.
- Destructive questions: confirm is `danger` and names the action ("Delete campaign"); **Cancel has the
  focus**. Other questions: confirm is `primary`. `ClearValuesDialog`: "Keep editing" (focused) and "Clear
  and save" (primary).
- `ConfirmDialog acknowledgeOnly` (feature 038 FR-044): a dialog that only informs ("Can't delete 'Q4'") has
  one **Close** button (secondary, focused) and no confirm button; it never asks a question it cannot act on.
- `FormDialog`: the first field (an input, a `Select` or a text area) has the focus; Enter submits; a second
  submit while busy is ignored. Without `submitLabel` it only shows (a picker that acts on a click): one
  Close button.
- `size="lg"` (both): 640 wide, for a preview or a list (Close purchase request, Submit changes, Import
  options, Add line items). No feature draws its own dialog frame (D-417).
- `role="alertdialog"` for questions, `dialog` for forms; the focus returns where it was.

### 5.4 Data display

**Data table standard** (D-415: one shared table style, `ui/Table/Table.module.css`; a feature table takes its
`table`, `scroll`, `numeric`, `nameCell`, `actions`, `sticky`, `total` and `empty` classes and keeps only rules for
its own columns — it never restyles the header band, rows, numbers, totals or empty row)

| Part | Spec |
|---|---|
| Container | Inside a table card; a scroll box with `position: relative; overflow-x: auto` (UI audit X-02), focusable (`tabindex="0"`, named "<table name>, scrolls sideways") when it overflows, with a fade shadow on the edge that has more content (AW-05) |
| Header row | 40 high, 12/18 Arial 700 `--ink`, **sentence case**, `--gray-bg` fill, 1 px `--hairline` bottom; sticky while the table scrolls; sortable headers are buttons with an arrow and `aria-sort` |
| Rows | Min 40 high (compact 32), cells 8 × 12 (first and last 24 horizontal), 14/20 `--ink`, 1 px `--row-divider` between rows, no vertical lines; hover `--hover`; highlighted row `--hover` with a 4 px yellow start bar; on both, secondary text, links and red text are Text Strong (§3.1) |
| Name column | First; the record name as a link: `--link`, 14 regular, underline on hover and focus; min width 200; wraps at word boundaries to at most 2 lines, then ellipsis with the full name in a tooltip. Never breaks inside a word (no `overflow-wrap: anywhere` in tables, UI audit X-01). |
| Person and team columns | `PersonLabel` / team tags, **no wrapping**, min width 160; more than 2 teams show "+n" with a tooltip |
| Status column | At most two chips (§4.1), no wrapping |
| Number, money, percent | **Right-aligned header and values, tabular figures, no wrapping**, one money format (§4.4) |
| Dates | Left-aligned, no wrapping, the person's format |
| Actions | Last column, 48 wide, the row's ⋯ (`sm`); its header is a visually hidden "Actions" |
| Totals row | The last row, in `<tfoot>`: a `--gray-bg` band (a sticky cell keeps the grey), 700 weight, no border above or below; on the grey, secondary text and links are Text Strong; numbers aligned as above. Its first cell is a row header (`<th scope="row">`) reading **Total**, optionally with a count on a second line, 12 regular (`TotalLabel`: "Total" / "12 activities") |
| Sortable header | **`SortHeader`**: the heading is a button with the label and a 12 px arrow (↕ in `--ink-2` while unsorted, ↑ or ↓ in `--ink` when sorted); hover `--hover` with an underline; `aria-sort` ascending, descending or none |
| Expandable rows | **`DisclosureButton`** before the name: 24 × 24 target, 16 px chevron (right closed, down open) in `--ink-2`, hover `--hover`; `aria-expanded`, and a name saying what it opens ("Expand Spring campaign", "Show the line items of Launch film"); rows without children keep the space (`DisclosureSpace`) |
| Empty | One row across all columns, padding 24 12, 14 `--ink-2`, centred (`empty`); a whole widget or card with nothing to show uses `EmptyState compact` instead |
| Never | Repeat the column's label inside the cell ("Owner: Alex Morgan", UI audit P-02); upper-case headers |
| Below 600 px | Scrolls inside its card; inbox-type lists (Approvals, Home lists) switch to stacked cards: name link, status, key facts as a 2-column `DescriptionList`, ⋯ |

**`TreeTable`** — the data table standard plus: a 4 px level bar at the start of the name cell; 24 px
indent per level; an expand button (24 × 24 target, 16 px chevron) before the name, named "Expand <name>" /
"Collapse <name>"; **Expand all · Collapse all** as secondary `sm` buttons in the card header; the plan row
shows its owner like every other row (avatar + name, UI audit PL-04); ARIA treegrid with one row in the tab
order (↑ ↓ → ← Home End Enter) as built; rows focus with an inset ring.

**`DescriptionList`** (new: the only key–value layout)

- A grid: label column **200 px** fixed at ≥ 600 px, then the value; 12 px between rows, 16 between
  columns; label 14 `--ink-2`, value 14 `--ink`; empty "—"; long values wrap.
- Below 600 px the label sits above its value (4 px).
- Used by details panels, record pages, Shell attribute values, finance coding and the stacked-card rows,
  so values start at the same x everywhere (UI audit X-08).

**`StatusChip`** — 24 high, padding 0 8, radius 4, 12/18 Arial 700, an 8 px dot in the family colour then
the word, `--status-<family>-text` on the family's tint; never wraps; the word is the meaning (§4.1).

**`CompletenessChip`** — a `problem` chip "3 fields needed" (or `positive` "All filled in"); a button that
opens a popover (radius 8, `--shadow-md`, padding 12 16, max 320 wide) listing the missing fields as links
to each field; "n items below need attention" is a second chip only where no status chip competes; in tree
rows it folds into the first chip's popover (at most two chips per row).

**`LevelTag`** — 20 high, padding 0 6, radius 4, 12/18 Arial 700 `--ink` on `--surface`, 1 px border in the
level colour; **sentence case** ("Campaign", "Line item"), never smaller than 12 px (UI audit AX-01). A record
type with no level of its own (a currency, a global budget in the recycle bin) is `LevelTag other` in the
same shape with the neutral status colour (D-418).

**`Tag`** (`ui/Tag`, D-418) — a fact about a record, not a status: plan type, BCPIR, "Default", "This
activity", an approval level's "L1", the activity types of a model. 20 high, padding 0 8, radius 4, 1 px
`--hairline` border on `--surface`, 12/18 Arial 700 `--ink`, sentence case, never wraps; never counts as one
of a row's two status chips.

**`RelativeTime`** (`ui/RelativeTime`, D-418) — when something happened: "3 days ago" (or the clock time
"14:05" in a list grouped by day) in 12/18 `--ink-2`, tabular, with the full date and time in a `Tooltip`.
A `TooltipText`, so keyboard and touch users reach the full time; its name is "3 days ago, 12 Mar 2026,
14:05" (the clock time's name is the full date and time). Used by Home's recent changes, the activity log
and the recycle bin.

**`CountBadge`** — min 20 × 20, padding 0 6, radius pill, the waiting family: `--status-review` at 16 %
with `--status-review-text`, 12/18 bold (5.11 light, 5.84 dark) — something waits for you; "99+" above 99;
a visually hidden label ("4 waiting for you"); nothing for 0.

**`ProgressBar`** — §4.6; `role="progressbar"` with the real percentage as `aria-valuetext`.

**`PersonLabel` and `Avatar`** — avatar 24 (`sm`, tables and pickers) or 32 (`md`, top bar and panels),
radius pill, `--avatar-bg` fill with `--on-accent` initials 12/18 bold (14.74 light, 11.58 dark), hidden
from screen readers; then the full name 14 `--ink`, " (you)" and " (inactive)" written out; an optional
second line 12 `--ink-2`. In tables the name never wraps (ellipsis with a tooltip).

**`TeamPill` / `TeamPills`** — a team **tag** (no pill shape): 24 high, padding 0 8, radius 4, `--chip`
fill, an 8 px team-colour dot, the name 12/18 `--ink`, " (inactive)" written out; max width 200 with an
ellipsis and the full name in a tooltip; never breaks inside a word; as a link, underline on hover. Several
tags wrap onto more lines with 8 px gaps (outside tables).

**`ShellAttributeValues`** — the shown attributes in a `DescriptionList`, grouped by section with an `<h3>`
(16/24 Arial 700) — **but never a heading equal to its parent's** ("Shell attributes" inside the "Shell
attributes" card shows no inner heading; UI audit X-09); "—" for empty; Yes / No; "(inactive)" written
out; the notes of the form.

### 5.5 Form fields

**`FieldShell`** (the frame of every field; also `inputs.module.css`)

| Part | Spec |
|---|---|
| Label | Above the control, 14/20 Arial 700 `--ink`. A field required to save: then 2 px and a `*` in `--danger` (Secondary Red), Arial 700 19/20, `aria-hidden`, the control `aria-required` (D-364). A field needed to publish or submit: then 8 px and the **marking** as a small tag ("Needed to publish", "Needed to submit": 20 high, padding 0 6, radius 4, `--chip`, 12/18 bold `--ink`). Then an optional ⓘ |
| Hint | **Always under the label, above the control** (one rule, UI audit F-02), 14/20 `--ink-2`; only for what people need while filling the field in (format, limit, example), a consequence, a lock's reason or text that changes with the data. What the field is for goes in the ⓘ tip beside the label (D-434). |
| Control | 40 high (48 below 600 px), padding 0 12, radius 8, 1 px `--control-border`, `--surface`, text 14 `--ink` (16 below 600 px), placeholder `--muted` |
| States | Hover: border `--control-border-hover`. Focus: the focus ring. Invalid: 1 px `--danger` border plus the message. Locked: the Disabled tokens (`--disabled-bg`, `--disabled-text`, `--disabled-border`) and a `LockedNote`. Read-only values are shown as text, not as inputs. |
| Note and error | Under the control, 4 px gap, 14/20: note `--ink-2`; error `--danger-text` with a 16 px alert icon. Screen readers hear marking, hint, note and error with the control (`aria-describedby`). |
| Width | Full column by default; short values use fixed widths: `xs` 120 (percent, year), `sm` 240 (money, codes, dates), `md` 360 |

**`TextField`, `PasswordField`, `TextAreaField`** — the control above; the password field has a **Show
password** toggle (32 px ghost icon button inside the end, `aria-pressed`); the text area is at least 96
high (4 rows), padding 8 12, resizes vertically, and counts down in its last 50 characters ("12 characters
left"; past the limit "3 characters too many"; typing is never cut off).

**`DecimalField` and `MoneyField`** — the control above with the value **right-aligned in tabular
figures**; the unit ("USD", "%") inside the end in 14 `--ink-2`; written out on leaving the field
("12,500.00"; "Rounded to 1,234.57" as a note); accepts "12500", "12,500.00" and "12.5k".

**`NumberField`** (`ui/NumberField`, D-423) — a whole number between `min` and `max` (a grid size, a row
count; never money): the field frame above with a native number control, right-aligned tabular figures; the
up and down arrow keys step by `step` (1) and stop at the bounds; an empty field is no value.

**Choices: one select style** (`ChoiceField`, `Combobox`; UI audit X-15)

| Situation | Control |
|---|---|
| One of up to 10 options | **`Select`** (Radix) everywhere — one control, one menu on `--raised` with the chosen option ticked; arrow keys, Space and type-ahead work, Escape closes the menu without choosing (D-416, D-417). In toolbars, filter bars and pagers: the label beside it, 32 px. In forms and the dashboard builder's inspector: `ChoiceField` frames it like an input (label above, 40 px, the column's width, the hidden native select sends its value with the form), starting "Choose…" (`placeholder` changes the words; `null` leaves the empty choice out for a setting that always has a value); options with a `group` are listed under their headings (bold 12 `--ink-2`, a hairline between groups) and stay a select at any length; **Enter on the closed control saves the form**, as from a text field. No feature draws its own select or chevron, and no native `<select>` is shown. |
| One of more than 10 options | `Combobox` (searchable) |
| Several of up to 6 options | Checkboxes in columns (auto-fill, min 200 wide) — not a long vertical list (UI audit AF-01) |
| Several of more than 6 options | `Combobox` with `multiple`; chosen values as removable chips under the input |

**`Combobox`, `PersonPicker`, `TeamPicker`** — input as above; the list is a popover the width of the
input (min 280), `--surface`, radius 8, `--shadow-md`, max height 320 with scrolling; a count line at the top
(12 `--ink-2`: "300 people"); options 40 high (two-line options grow), hover and active `--hover`, chosen
options ticked (16 px) and `aria-selected`; "No one matches 'xyz'." when empty; chosen values as chips
(24 high, radius 4, `--chip`, ✕ in a 24 px target). People show avatar, name and job title; "(you)" first.
Inactive values that are kept carry an ⓘ explaining why.

**`CheckboxField`** — a 20 × 20 box, radius 4, 1.5 px `--control-border`; checked: `--blue` (Link) fill with a
tick the browser keeps legible (`accent-color: var(--blue)`, set once in `global.css` for every check box and radio
button, D-417); the bare box is `Checkbox` (same file; `indeterminate` for "Select all rows on this page"),
for a list row or a table's select column, named by its label or `aria-label`; the label (14 `--ink`, regular) is part of the click target; the
row is at least 24 high; ⓘ, hint, `LockedNote` and error as in `FieldShell`. A group of checkboxes is a
`fieldset` whose legend uses the label style. Switches (All work) are 40 × 24, radius pill, `--control-border`
when off and `--blue` when on, with the label on the right.

**`RadioGroup`** (`ui/RadioGroup`, D-417) — a few choices shown at once: a `fieldset` whose legend has the label
style (or is hidden, `labelHidden`), the `FieldShell` ⓘ, hint, note, `LockedNote` and error; each option a 20 px
radio (`--blue` when chosen) and its label 14 `--ink` in a row at least 24 high, with an optional second line
(`hint`, 12 `--ink-2`, may hold chips) and its own `LockedNote` when it can't be chosen (`disabledReason`).
`layout`: `column` (default), `row` (side by side, wrapping: Warn · Refuse, the spread methods) or `list`
(bordered rows split by hairlines: the move and copy destinations); options with a `group` sit under small
headings (12 bold `--ink-2`). Arrow keys move the choice; the group's id is its `name`, so the error summary can
focus it. Every radio button of the app is one.

**`DateField`** (`ui/DateField`, D-417, D-424) — one calendar date, never the browser's date input: in forms, the
`FieldShell` frame (label, marking, hint, note, error; `min`/`max`); in filter bars (`compact`, 168 wide), the label
beside a 32 px control like `Select`, its problem under it, announced. The text input **shows the person's date
format** ("12 Nov 2026") and **accepts typing** in that format, "12 Nov 2026", dd/mm/yyyy or yyyy-mm-dd: a date
counts as soon as it reads as one and is rewritten in the person's format when the field is left; text that is
not a date shows "Enter a date like 12 Mar 2026." as the field's problem and leaves the field empty. The value
stays a calendar date ("YYYY-MM-DD"); a hidden input carries it under the field's `name`. Inside the input on the
right, a `tertiary` icon button **Choose date** (named "Choose start date", "Choose to date") opens the
**date picker** in a `Popover` (`md`). Used by the rate dialog, the bulk Change field value, purchase-request
lines and every `DateRangeMenu`; `DateRangeField` uses the same control.

**Date picker** (`ui/DatePicker`, D-424) — our own calendar, following the WAI-ARIA date picker dialog: a header
with **Previous month** and **Next month** (`tertiary` icon buttons) and Month and Year `Select`s to jump; the
month and year announced (`aria-live`) and naming the grid; a `role="grid"` of the month, **weeks from Monday**,
weekday headers (Mo … Su, full names as `abbr`), days 32 × 32 (above the 24 px target), each named in full
("Thursday 12 November 2026"); **today** outlined in `--ink` and `aria-current="date"`; the **chosen day** filled
Primary Yellow with `--on-brand-yellow` text (yellow as "you are here", never yellow text); days outside
`min`/`max` in `--disabled-text`, `aria-disabled` and named "…, not available", with the reason under the grid
("Choose a date from 01 Mar 2026 to 31 May 2026.", the grid's description); a footer with **Clear** and
**Today** (disabled when today is outside the range, the reason above it). It opens on the chosen day, else
today kept inside the range, with the focus on that day. Light and dark from the tokens.

| Key (in the grid) | Does |
|---|---|
| ← / → | Previous / next day |
| ↑ / ↓ | Same day of the previous / next week |
| Home / End | First (Monday) / last (Sunday) day of the week |
| Page Up / Page Down | Same day of the previous / next month (the last day of a shorter month) |
| Shift + Page Up / Page Down | Same day of the previous / next year |
| Enter / Space | Choose the day, close, focus back on the Choose date button |
| Escape | Close without choosing, focus back on the Choose date button |
| Tab | Moves between the header, the grid and the footer |

All work's Month calendar (`features/all-work/MonthCalendar`) lays out its weeks with the same calendar core
(`ui/DatePicker/calendar.ts`: month days, Monday-first week rows, month and weekday names).

**`InlineError`** (`ui/InlineError`, D-417) — one problem in one line: a 16 px alert icon and 14/20 `--danger-text`.
`FieldShell`, `CheckboxField`, `DateRangeField`, `RadioGroup` and `TextField` show a field's problem with it
(`quiet`: heard with the field through `aria-describedby`); on its own (a dialog's failed action, a gone record)
it is `role="alert"`. A failure with several lines or a next step is a danger `InlineAlert` instead.

**`DateRangeField`** — two dates (start, end) side by side, each the `DateField` control (typed in the person's
format or chosen on the date picker, D-424), each with its own problem under it. The allowed range
limits the choice (start no later than end, both inside the parent's dates) and is written under both inputs ("Must be inside the campaign's dates (01 Feb – 30 Nov
2026)"); a non-blocking warning shows in `--warning-text` with a warning icon. This replaces the browser's
date input, which shows "12/31/2026" in US-English browsers and its own calendar (UI audit X-15, C-04; functional
review P-03; D-424).

**`SplitEditor`** — the chosen values in a small table: value · share (a `DecimalField`, `xs`, right-aligned,
"%" unit); under it the running total in 14 bold: "100.00% — complete" (`--success-text`), "90.00% — 10.00%
left" (`--ink-2`), "110.00% — 10.00% too much" (`--danger-text`); **Split evenly** as a secondary `sm` button.

**`YearRangeField`** (feature 016) — two selects, **From** and **To**, that keep From ≤ To, at most five years
apart on All work ("Choose at most 5 years."), with **All years** where a list allows it (Plans).

**Budget by month card** (feature 016) — on the plan page and the campaign and initiative panels: the phasing
(None · Evenly · Custom months) with a period table and the running total ("100,000.00 of 600,000.00
phased — 500,000.00 left"); **Edit** opens the phasing editor in a side panel; a mismatch is a warning, not
a block.

**`ShellAttributeFields`** — the attribute sections in the order of the form definition, each field by the
choice rules above; dependent fields stay visible but locked with a reason until their parent is set; the
Settings preview highlights one attribute with `--hover`, its secondary text in Text Strong (was a
blue tint); never a heading equal to its parent's (X-09). Fields fill one grid, three columns from 900 px wide and two
from 600 px, so every row lines up; check boxes and drop-downs take one column, the boxes listed down it; a long text
or split takes the row and waits until the row before it is full, in the page order too, so Tab follows the screen
(D-433).

**`FormSection`** — one white card per section on form pages: title `<h2>` Jost 600 18/24, optional
description 14 `--ink-2`, fields 20 apart. Inside a side panel, sections are separated by 32 px and an
`<h3>` (16/24 Arial 700) instead of cards.

**`FormFooter`** — sticky at the bottom of the window across the content column, `--surface`, 1 px
`--hairline` top border, padding 16 24, 72 high; buttons right-aligned on the content's right edge:
**Cancel · Save and add another · Save** (primary last). Save is never disabled. Below 600 px the buttons
stack full width in the same order.

**`FormErrorSummary`** — an `InlineAlert` of the danger family at the top of the form: title `<h2>` 16/24
Arial 700 "2 problems need your attention", then each problem as an underlined `--link` link to its field;
it takes the focus when it appears, so it is read out (FR-020).
`onGo` takes the person to a problem the page shows itself (a dashboard widget), and `describe` words a
problem with its place ("<widget>: <problem>").

**`LockedNote`** — a 16 px lock icon and one sentence, 14/20 `--ink-2`, 4 px under the locked control.

**`InfoTip`** — a 16 px ⓘ (`--ink-2`) in a 24 × 24 target after a label, named "About <label>"; opens a
popover (`--surface`, 1 px `--hairline`, radius 8, `--shadow-md`, padding 12 16, max 320 wide, text 14
`--ink`) on hover, focus, click and tap; closes on Escape, when the pointer leaves (150 ms grace), on
focus loss and on a click outside (WCAG 1.4.13).

### 5.6 Feedback

**`Toast`** — width 360–480, padding 12 16, radius 8, `--surface`, `--shadow-md`, a 4 px start bar and a
20 px icon in the feedback colour (`--success` for done, `--danger` for failed, `--info` otherwise), the
message 14 `--ink`, one action as a bold underlined `--link` ("View", "Undo"), Close (✕, 24 px target).
**Placement: bottom-left of the content column at ≥ 600 px, full width (16 px margins) below 600 px —
always above a sticky form or panel footer, never covering it** (functional review P-09; WCAG 2.4.11). At
most 3 at once, newest at the bottom. 4 s, or 10 s with an action (FR-026); paused while hovered or
focused; F8 moves the focus to it; announced at once.

**`InlineAlert`** (`ui/InlineAlert`, D-417) — a message inside the page: padding 12 16, radius 8, the feedback colour at 8 %
(12 % in dark mode), a 4 px start bar and a 20 px icon in the feedback colour, optional title 14 bold, text
14 `--ink`, optional action link. Families: info, warning (waiting), success, danger; `icon` replaces the
family's icon where the words need another (a clock for a purchase request waiting for approval). Red is never
tinted: a danger alert is `--surface` with a hairline frame and its red bar. `role="status"`, or
`role="alert"` for failures (`FailureMessage` of `FormPanel` is one: the message bold, the next step under it). Used for: waiting and declined notices on record pages (with the decline
reason), failed saves, "view only" notices, "Shown because the plan's business unit includes Lubricants".

**Approve warning** (feature 038, D-360) — when an activity's line items exceed its planned cost, the approval
section of the activity or purchase request and the Approve dialog show a warning alert above the decision, one
line per activity: "Line items of activity 'Launch film' are 25,000.00 USD above its planned cost" (Warn the
approver). With Refuse approval, **Approve** stays visible but disabled, described by that reason; Decline and
Recall stay enabled.

**`EmptyState`** — `compact` inside a card among others (Home): icon, words and action on one 32 px row. Otherwise centred in its card, padding 48 24; a 48 px outline icon in `--ink-2`; title Jost 600
20/28; one sentence 14 `--ink-2` (max 480 wide; Text Strong in a not-found or no-access message, which
sits on the grey page without a card, §3.1); the action. **The action is a secondary button when the
page header already holds the same primary action** ("New plan"), and the primary only when the page has
no other (§11, rule 1).

**`ViewOnlyNote`** (feature 014) — an info `InlineAlert` with a lock under the page header, once per page,
where the person may change nothing: "View only — your role (Viewer) lets you see this plan but not change
it. Ask an administrator (Alex Morgan) if you need to change it." (Settings: "View only — only
administrators change Settings. Ask … if something needs to change."). Menus on that page leave out what the
person may not do; elsewhere such an action stays, disabled with the server's reason (D-352).

**`NoAccess`** (feature 014) — the no-access page at the address of a page or form the person's roles do
not open: a shield icon, "No access" as the title, the server's sentence and **Go to Home**. A record
outside the person's access shows the not-found page instead, so nothing of it is revealed.

**`ErrorState`** — the same layout with a white alert icon on a 48 px `--danger-bg` circle (a cloud icon when offline),
the plain-language message as `role="alert"` and **Try again** (secondary, with a refresh icon). No
technical details on screen.

**`Skeleton`** — `--chip` shapes, radius 4, the height of the real content (table rows 40, text lines 20) so
nothing jumps when data arrives; a slow shimmer that stops with reduced motion; screen readers hear
"Loading…". Old data stays visible while refreshing.

**`Tooltip`** — `--tooltip-bg` / `--tooltip-text`, 12/18, padding 4 8, radius 4, max 280 wide,
`--shadow-md`, an arrow; opens after 300 ms on hover and on keyboard focus, stays while hovered, Escape
hides it. On a touch screen a tap on a control that only shows something (no action of its own, not a link)
opens it and a tap elsewhere closes it (D-418). It only describes: the control has its own name. Never inside
menus, never on the close button of a dialog, panel or drawer (R14). **No native `title` tooltips**: they
reach neither the keyboard nor touch; the exceptions are a truncated text whose full text is in the page (the
purchase-order path in the GSAP link report) and the decorative segments of a stacked bar, whose figures
the Table view lists.

**`TooltipText`** (`ui/Tooltip/TooltipText`, D-418) — text that looks plain but shows more in a `Tooltip`:
a shortened summary value ("$1.25M" → "$1,250,000.00"), a time, a "—" with its reason. A button without a
frame, so the keyboard and touch reach it; only its focus ring shows it is a control.

**`DemoBanner`** — §2.1 (Text Strong, 32 high, one line, 12 px in `--banner-text`).

### 5.7 Brand

**`Logo`** — §3.10: the name "SP&A One" in its colours (`md` 18 px; `lg` 20 px), one image named "SP&A One"
for assistive technology. **`ProductName`** — the same coloured name in the surrounding font, for a title. **`LogoTile`** — the 28 px blue tile with the yellow "1"; decoration, so the link
around it is named "SP&A One home".

### 5.8 App shell parts (`frontend/src/app/`)

| Part | Spec |
|---|---|
| `TopBar` (new) | §2.1; replaces `MobileTopBar` at every width |
| `Sidebar` | §2.1: white, 240 / 64, items 40, the yellow bar with the hover-grey fill, "More" group label, Collapse at the bottom. Account, bell and theme move to the top bar. |
| `NavDrawer` | §2.1: below 600 px, 280 wide, from the left; a `ui/Drawer` |
| `AccountMenu` | Opened from the top bar's avatar button; a menu (§5.1 look) with name and role (not a link), My profile, Appearance (three choices, the current one ticked), a separator, Sign out |
| `NotificationBell` | 40 px ghost icon button with `CountBadge`; opens a 360 wide popover (radius 8, `--shadow-md`) with the notices, **Mark all as read** (ghost) and links |
| `ThemeToggle` | Becomes the Appearance choice inside `AccountMenu` |
| `PublicLayout` (sign-in) | `--page-bg` canvas, one centred white card (max 400 wide, radius 16, padding 32) with the logo, the title "Sign in to SP&A One" (Jost 700 28; the name in its colours through `ProductName`), the fields (48 high) and **Sign in** (primary, `lg`, full width). The brand appears once (UI audit S-01); no gradient header (S-02). |

---

## 6. The standard CRUD pattern

Every user-managed record follows this pattern. Specs refer to it as "the standard CRUD pattern".

### 6.1 List

1. Page header with the plural name and **New <thing>** (primary, at the end of the actions); no description
   that says what the page is (D-421, D-422).
2. The list toolbar of §5.2 (`FilterBar`): a search box that says what it searches ("Search name or ID"), a
   segmented filter for status, a **Filters (n)** button for the rest, removable filter chips with **Clear
   filters**, and a result count ("12 of 40 plans"); all of it kept in the address, written in place.
3. Table (or cards for plans) by the data table standard (§5.4): name as a link, status chip, key facts,
   money with currency, a row **⋯ Actions** menu (View · Edit · Duplicate · record-specific actions ·
   Delete last, separated).
4. Selecting a row opens the record's **details view** — never straight into edit.
5. Empty state: "No plans yet" with the create button (secondary, because the
   header holds the primary); when filters hide everything: "Nothing matches these filters" with **Clear
   filters**.

### 6.2 Create

- Entry: the list's **New <thing>** button, or **Add <child>** on the parent (the parent is pre-filled).
- Short records (campaign, initiative, Settings items, person, team, approval workflow) open in a **side
  panel**; long records (plan, activity, line item, Shell attribute) open on a **full page** with sections
  (§2.5).
- One column; sections in a logical order; defaults pre-filled without a label naming where they came from,
  except a pre-filled amount (D-422);
  a field required to save shows a red **\*** after its label, with the legend "\* Required" once before the
  first field (D-364); **Needed to publish** and **Needed to submit** stay words.
- Footer: **Cancel** · **Save and add another** (for children) · **Save** (primary, last), right-aligned
  (§5.3, §5.5). Cancel asks before discarding typed values.
- After saving: toast "Initiative 'Digital & social' created — View"; the new row is highlighted.

### 6.3 View (details)

- Header (§2.3): breadcrumb (Plans › FY2026 Lubricants › Helix launch), record name, and the meta row with
  level tag, **status chip**, **completeness chip**, ID, owner, dates; money in summary cards; "Created by …
  on …, last changed by … on …" at the end of the Details tab or card.
- **Actions — one primary, chosen by the person's main job on this record:**
  - The owner or an editor: **Edit** (primary) · the next status action as a secondary button
    (**Publish**, **Submit for approval**) · **⋯ More** (Duplicate, Copy to…, Move to…, View history,
    Delete).
  - An approver of the current level, on a record waiting for them: **Approve** (primary) and **Decline**
    (secondary) side by side; Edit moves into ⋯.
  - The owner of a submitted activity is never offered Approve as a button; where the rules let them
    approve (D-020), it is in ⋯ with the warning (functional review A-01; client confirmation pending).
- Sections or tabs (§2.4 B): Overview (read-only fields; empty values show "—"), child records with counts,
  Approval (activities), History.

### 6.4 Edit

- **Edit** turns the details into a form with the same order of sections.
- **Save is never disabled.** On Save, every problem appears at once: a summary at the top with links,
  and a message under each field. Nothing is saved while problems remain.
- Consequences are confirmed before saving ("Changing planned cost sends this activity back for
  approval").
- Leaving with unsaved changes asks **Keep editing** (default) or **Discard changes**.

### 6.5 Delete

- A dialog: "Delete campaign 'Helix launch'?" — what goes with it ("3 initiatives, 12 activities and 20
  line items"), the effect ("Plan totals will update") and where it goes ("It moves to the recycle bin;
  you can restore it"). **Cancel** has focus; the red button says **Delete campaign**.
- After deleting: back to the parent; toast "Campaign 'Helix launch' deleted" with
  **Undo** (visible at least 10 seconds).
- The dialog and toast promise the recycle bin only where a person can open it (UI audit A-01, functional
  review P-02).

### 6.6 Locked and read-only

Nothing is greyed out without a reason next to it:

| Situation | Shown as |
|---|---|
| Calculated | Small "Calculated" label and ⓘ with the formula |
| From finance/GSAP later | "Filled by GSAP later" / "From finance (coming later)" |
| Fixed after save | Lock icon + "Year can't change once the plan is saved — create a new plan for another year." |
| Irreversible choice | Warning when ticked: "Ongoing can't be undone after saving." |
| Waiting for approval | `InlineAlert` (warning): "Submitted for approval — changing planned cost or dates will restart approval." |
| Action not yet possible | The button stays visible; clicking it explains: "Publish needs 4 fields — view list". |
| View-only section | `InlineAlert` (info) under the header: "You can view these settings. Ask an administrator to change them." |

### 6.7 Set inactive (Settings records)

One behaviour for "set inactive" and "deactivate" everywhere: when the record is in use, a dialog lists
where ("Used by 2 line items") before it applies; when it is not in use it applies at once with an **Undo**
toast. Reactivating needs no question. (Functional review S-01; the confirmation for records in use is a
proposal awaiting the product owner, see the implementation plan.)

---

## 7. Forms

- One centred column, max 960 px wide (§2.4 C), section headings in the order users think: *Basics →
  Dates & cost → Shell attributes → Goals → More details*; each section a card on form pages (§5.5
  `FormSection`) under the sticky section bar. Fields one per row, except the deliberate pairs of §2.4 C.
- Labels above fields; the hint between label and field; the note and the problem under it (§5.5).
- Dependent fields stay visible but locked with a hint until their parent is set ("Choose teams first —
  the owner must belong to one of the plan's teams"). When only one option fits, it is filled in and
  said so ("Region set to 'Retail – China', the only region for this cluster").
- Changing a parent value that invalidates child values lists what will be cleared before saving.
- Attribute groups that depend on the business unit say why they are shown ("Shown because the plan's
  business unit includes Lubricants").
- Validation messages say what is wrong and how to fix it: "End date must be on or after the start date
  (12 Mar 2026)." — never codes or technical text.
- Choices follow the one-select rule (§5.5); date fields show the person's date format.
- The form says how far it is: the section bar counts the needed fields filled ("9 of 15 needed fields
  filled").

---

## 8. Words on screen

Shell business terms are kept: Plan, Campaign, Initiative, Activity, Line item, SWBS, GL code, BCPIR,
SP&A, AOP, SMP, INQ, MQL. Hive9 interface terms are replaced:

| Hive9 term | MAPP label |
|---|---|
| Inspection Window | Details (side panel or page) |
| Honeycomb | Select (checkboxes and a bulk-action bar) |
| HUD / heads-up display | Summary cards |
| Sys_Gen_Balance | Unassigned planned cost |
| Create SWBS Code | Request SWBS code from GSAP |
| Override Model | Set later stages myself |
| Evergreen | Ongoing (no end date) |
| Waterfall Goal | Goal stage |
| C / E / F / L | Custom · Evenly · All in first month · All in last month |
| Show Hierarchies | Show levels |
| (Not Completed) | Not filled in |
| Plan Log / Finance Log | Activity log |

Buttons use verbs; messages are short, friendly and specific; **sentence case everywhere, no upper-case
labels**; page titles match their menu names ("All work", "My profile"); the same problem is worded the
same way on every page ("1 line item needs attention"). Dates follow the user's format (default
`DD MMM YYYY`, e.g. 12 Mar 2026). A date range shown as a value is written one way everywhere (D-216): in
`DD MMM YYYY` with the year once when both dates fall in the same year ("01 Mar – 31 May 2026"), otherwise
both dates in full ("01 Dec 2026 – 31 Jan 2027"); in the other formats both dates in full ("01/03/2026 –
31/05/2026"); an ongoing activity reads "Ongoing from 01 Mar 2026". Percentages are written "38%"; empty
values "—" (§4.4).

---

## 9. Accessibility (WCAG 2.2 AA)

The target is **WCAG 2.2 level A and AA**, as in Shell's public accessibility statement (product-owner
decision 4, D-313). Automated checks run axe with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`.

- **Keyboard:** everything works with the keyboard; the order of focus follows the order on screen; menus,
  tabs, trees and comboboxes follow the WAI-ARIA patterns described in §5.
- **Focus visible (2.4.7) and not obscured (2.4.11):** a 2 px `--focus-ring` (Text Strong of the active
  theme) with a 2 px offset on every control (inset inside tables, menus and trees), shown for keyboard
  focus (`:focus-visible`), not after a mouse click (UI audit AX-03). Sticky top bar, table headers, form
  footers and toasts never cover the focused element: `scroll-padding` equals their height.
- **Names:** every control has a visible label or an accessible name; icon-only buttons have a tooltip and a
  name. Exception: the close button inside a dialog, side panel or drawer has the name "Close" (or "Close
  menu") but no tooltip, because a tooltip there would swallow the first Escape (feature 001, research
  R14); inside the drawer, items show text labels instead of tooltips.
- **Contrast:** text ≥ 4.5:1 (Text Subtle, links and red text only where §3.1 allows them, Text Strong elsewhere; §4.1); control
  borders, focus rings and meaningful icons ≥ 3:1 (1.4.11). Yellow is never text and never the only sign of
  a state.
- **Colour is never the only signal (1.4.1):** status as a word, the current place as bold text plus the
  bar plus `aria-current`, links in sentences underlined.
- **Target size (2.5.8):** every target at least 24 × 24 px (§3.6); controls are 32–48 px.
- **Dragging (2.5.7):** nothing needs dragging; any future drag (reordering, calendar bars) has a button or
  menu alternative.
- **Consistent help (3.2.6):** help, when it exists, is always in the top bar at the same place.
- **Redundant entry (3.3.7):** values already given are offered again instead of typed twice (defaults from
  the parent).
- **Accessible authentication (3.3.8):** sign-in allows paste and password managers; no puzzles.
- **Errors:** announced and linked from the summary; the focus moves to the summary on a failed save.
- **Motion and zoom:** respect reduced motion; usable at 200 % zoom and reflowing without sideways scrolling
  at 320 CSS px (1.4.10; 400 % zoom on a 1280 px screen); text spacing overrides do not break layouts
  (1.4.12).
- **Forced colours:** cards, inputs and the current-place marker keep visible borders in Windows
  high-contrast mode.
- **Landmarks:** skip link, one `header` (top bar), one `nav` (sidebar), one `main`, one `footer`; one `h1`
  per page.
- **Screen sizes:** works from 390 px phones to 1920 px desktops; no page scrolls sideways at any width.

---

## 10. Usability targets (used in success criteria)

| Task | Hive9 (estimate) | MAPP target |
|---|---|---|
| Create a plan | ~14 steps | ≤ 6 steps |
| Add a campaign | ~8 | ≤ 5 |
| Add an initiative | ~7 | ≤ 3 |
| Add an activity with one line item | ~32 | ≤ 15 |
| Submit an activity for approval | 4 + retries (one error per save) | ≤ 2, all problems shown at once |
| Approve from the approvals inbox | ~8 | ≤ 3 |
| Find an activity by name or ID | 4–10 | ≤ 2 |
| Change the owner of 20 activities | ~27 | ≤ 6 |
| Restore a deleted item | 4–7 | 1 (Undo) or ≤ 3 |

A *step* is one click, selection or field entry. Generic success criteria for specs:

- At least 90 % of first-time users create, edit and delete a <record> without help, each task within
  2 minutes (5 for long forms).
- Every problem with a form is shown in a single save attempt.
- 100 % of read-only fields and unavailable actions explain why.
- Users can tell a record's status and what is missing without opening another screen.

---

## 11. Consistency rules (binding checklist)

Each rule has an automatic check where one is practical; reviewers check the rest on the screenshots
listed in the implementation plan.

| # | Rule | How it is checked |
|---|---|---|
| 1 | **At most one yellow primary button per page or dialog.** A page is the page header and its content; each open dialog or side panel is its own scope. Destructive confirm buttons are red, not yellow; an empty state's button is secondary when the header holds the primary. | e2e: count visible primary buttons per scope ≤ 1 on every captured state; unit tests on `PageHeader`, `SidePanel`, dialogs |
| 2 | **Numbers right-aligned with tabular figures** in tables, totals and amount inputs; headers aligned with their values; "38%" without a space. | e2e measurement: right edge of every numeric cell equals its header's (± 1 px); unit tests on number formatters |
| 3 | **One page-header layout:** every page uses `PageHeader` (breadcrumb row, title, meta, actions in fixed slots); no other component renders an `<h1>`. | Unit test scanning `src/features` for `<h1`; e2e: title top at the same y (± 1 px) on every page |
| 4 | **One panel footer layout:** right-aligned, Cancel or Close (secondary) · secondary actions · primary last; destructive actions in the header's ⋯. Dialogs and form footers follow the same order. | `SidePanel` takes action props, not free content; unit tests |
| 5 | **One date format:** the person's format in text and inputs, ranges per D-216, times 24-hour; all through `lib/format.ts`. | Lint: no `toLocaleDateString` / `Intl.DateTimeFormat` outside `lib/`; formatter unit tests |
| 6 | **Status colour meanings:** each status word has one family (§4.1) through one mapping; the same word never shows in two colours; red only for danger and errors; yellow only for the primary action, the current place and the highlighted row. | Unit test over the mapping; e2e colour sampling of chips on the calendar legend and the plan tree |
| 7 | **One height per control size** (32 / 40 / 48); controls side by side share a size. | stylelint: `height`/`min-height` of controls only from `--control-*` |
| 8 | **Tokens only** for colour, type, spacing, radius, shadow; only the breakpoints of §2.2; every token pair of §3.1 and §4 passes its contrast threshold in both themes. | stylelint; a Vitest test that parses `tokens.css` and checks every listed pair |
| 9 | **One key–value layout** (`DescriptionList`, 200 px labels) and **one table standard** (§5.4). | Code review; e2e: value columns start at the same x within a page |
| 10 | **Names never break inside a word** in tables, trees and tags (`overflow-wrap: anywhere` is not allowed). | stylelint rule; e2e: no table row taller than 64 px on the captured states |
| 11 | **One money format per screen** (§4.4); empty values "—". | Formatter unit tests; e2e text checks on the activity page and Home |
| 12 | **Sentence case**, no upper-case text, normal letter spacing, text ≥ 12 px. | stylelint (`text-transform: uppercase`, `letter-spacing`, font sizes); e2e: no rendered text under 12 px |
| 13 | **One select style** (§5.5), one date input, one radio group, one check box and one inline error and alert; filters, dropdowns, popovers, menus and Export only from `src/ui` (`Select`, `ChoiceField`, `DateField`, `RadioGroup`, `Checkbox`, `InlineError`, `InlineAlert`, `FilterMenu`, `FilterMenuButton`, `FiltersButton`, `Popover`, `Menu`, `ExportMenu`; D-416, D-417). | Code review: no `radix-ui` Popover or DropdownMenu, no `<select>` and no `type="radio"`, `"checkbox"` or `"date"` input outside `src/ui`; e2e screenshot review |
| 14 | **Lists say their count the same way** ("4 of 6 plans", `ResultCount` and `countText`) and record-state filters read "Active (n) · Inactive (n) · All (n)". | e2e text checks on each list page |
| 15 | **Nothing covers the focus or the next action:** toasts sit above sticky footers; sticky bars set `scroll-padding`. | e2e: the Save button is not covered after a create; axe |
| 16 | **A heading never repeats its parent's heading.** | e2e: no two consecutive headings with the same text |
| 17 | **No page scrolls sideways** at 390, 600, 960, 1280 and 1440 px wide. | e2e: `scrollWidth ≤ innerWidth` on every captured state |

**Enforced by lint (D-420).** `pnpm run lint` refuses, in features and app, a raw `select`, `textarea`,
`dialog`, `progress`, `hr`, text, number, search, date, radio or checkbox `input`, a `title` attribute and
any `radix-ui` import outside `src/ui`, naming the `ui/` component to use. `pnpm run lint:css` refuses
literal colours, font weights, font sizes and radii (tokens only), and `:global(`, `thead th` and `tfoot`
in feature CSS. A justified exception carries `eslint-disable-next-line … -- reason`.

---

## 12. Waiting for official Shell assets

These items use provisional, open stand-ins until Shell supplies the real thing; each switch is one token
or one component (see the recommendations report for the questions to Shell).

| Item | Now | When Shell supplies it |
|---|---|---|
| Heading typeface (Shell Heavy / Bold / Book, URW, proprietary) | Jost 600/700 (OFL) in `--font-heading` | Change `--font-heading` (and possibly `--font`) and self-host Shell's files under its licence |
| Pecten and trade-mark consent | The name SP&A One and the "1" tile | Place the pecten as Shell requires beside the name and in `LogoTile` and the favicon, following Shell's placement and clear-space rules |
| Dark-theme values marked TODO(DARK_TOKENS) in constitution X | Earlier dark values: Link Hover `#8CB4E6`, Disabled Text `#B0B8C1`, error red `#FF5C5F` / `#FF7B7E` | Update §3.1 and `tokens.css` and re-run the contrast checks |
| Shell's internal design system ("Shell DS") | This document | If mandatory for internal tools, its tokens and components replace ours where they differ |
| Icon set | lucide outline icons | Swap the icon imports |
| Internal accessibility checklist | WCAG 2.2 AA | Add its extra checks to §9 and the test suite |

---

## Change history

| Version | Date | Change |
|---|---|---|
| 1 | 18 Oct 2026 | Apple-inspired design language (D-005), feature 001 tokens (research R17) |
| 2 | 20 Oct 2026 | Shell visual language per the product-owner decisions of 20 Oct 2026 (D-310–D-314): Shell tokens light and dark with contrast values, Jost + Arial type scale, spacing, radius, elevation, control heights, breakpoints and widths; top bar and white sidebar with the yellow bar; one page header and five page templates; specs for every shared component; WCAG 2.2 AA; consistency checklist. §6–§8 and §10 kept, with §6.3 (one primary by role), §6.7 (set inactive) and §7 (rail, progress) added. |
| 2.1 | 26 Oct 2026 | Feature 020, Shell palette (constitution X): Primary Yellow `#FFC600` (hover `#FFCB14`, press `#EBB600`), Secondary Red `#DD1D21` and every theme colour exactly, light and dark; `--raised`, link states and Disabled tokens added; `--brand-yellow-tint` and `--danger-bg-hover` retired, red and yellow never tinted or shaded; where Text Subtle, links and red text may sit, with Text Strong elsewhere; Text Strong focus ring; problem chips a red fill; the navy and dark-blue roles moved to palette tokens (§3.1, §3.10, §3.11, §4.1, §4.3, §5, §9, §12). |
| 2.2 | 28 Oct 2026 | Features 032 and 033: the purchase-request screens, their words and confirmations (§2.6); level tags PURCHASE REQUEST and PR LINE in the line items' grey (§4.2). |
| 2.3 | 28 Oct 2026 | Feature 035, constitution 4.5.0: the product is shown as SP&A One; the name is the logo with "&" Shell dark blue and "One" Shell yellow (`#AD8700` on light surfaces); `LogoTile` with a yellow "1" below 960 px and as the favicon; tokens `--brand-name-amp`, `--brand-name-one`, `--brand-tile`, `--on-brand-tile`; `--brand-mark` and the star retired (§1, §2, §3.1, §3.10, §5.7, §6, §12). |
| 2.4 | 29 Oct 2026 | Feature 038: grids add up in every display currency (§4.4); `ConfirmDialog acknowledgeOnly` (§5.3); the approve warning and disabled Approve for approval over planned cost (§5.6). |
| 2.5 | 30 Oct 2026 | Measure module kick-off (constitution 4.8.0): report pages — the report frame, filter panel, saved views, today marker, ranked list and the empty states that say why (§2.8). |
| 2.6 | 1 Nov 2026 | Feature 051, constitution 4.9.0: custom-dashboard charts with Apache ECharts (ADR-0020); chart palettes Categorical, Planning, Levels and Sequential with tokens `--chart-cat-1`…`-8` and `--chart-seq-1`…`-5`; the Dashboards list, the custom-dashboard viewer and the builder layout (§4.7). |
| 2.7 | 12 Nov 2026 | UI review of the Measure module and Home (D-411, D-412): report toolbar with All work's filter buttons, Period and Show on their widgets, ECharts time charts, ranked-list behaviour (§2.8); `StatStrip`, `Select`, `Pager`, compact `EmptyState` (§5); a quieter chosen `SegmentedFilter`; `--hover-on-card` for hovers inside cards. |
| 2.8 | 12 Nov 2026 | Form pages redesigned: one centred column of at most `--form-page` 960 px for header, form and footer; the right rail and the count line under the header replaced by a sticky section bar at the top of the column with a yellow "you are here" marker; deliberate field pairs (`FieldRow`) instead of one field per row everywhere (§2.2, §2.4 C, §3, §7). |
| 2.9 | 12 Nov 2026 | Filters, dropdowns, popovers and menus only from `src/ui` (D-416): `Menu` and `Popover` on one floating surface, `ExportMenu`, `FilterMenuButton`, `FilterMenu` moved from All work, `ResultCount` with `countText`; toolbar selects become `Select`; `ChoiceField` gains `placeholder` and option groups (§5.1, §5.2, §5.5, §11). |
| 2.10 | 12 Nov 2026 | D-415: generic elements come only from `ui/`; the data table standard is `ui/Table` (header band, rows, numbers, sticky name, Total row with `TotalLabel`, empty row), with `SortHeader`, `DisclosureButton` and one `Pager` with placements and named page-size sets (§2.8, §5.2, §5.4). |
| 2.11 | 12 Nov 2026 | D-417, form controls only from `ui/`: `ChoiceField` renders `Select` (form size 40 px, option groups, Enter saves, no native select); `RadioGroup` (column, row, list; hints, groups, locked options) for every radio button; `Checkbox` for bare check boxes; `accent-color` once in `global.css`; `DateField` (form and `compact`); `InlineError` and `InlineAlert` (moved from line items and approvals); `FiltersButton`; `ConfirmDialog`/`FormDialog` `size="lg"` and a show-only `FormDialog`; `Popover` width `anchor`, used by `Combobox` (§5.2, §5.3, §5.5, §5.6, §11 rule 13). |
| 2.12 | 12 Nov 2026 | D-418, display pieces only from `ui/`: `SectionHeading` with five ranks (section 20, panel 18, card 16 Jost 600; sub 16 and label 14 Arial 700), used by `Card` (titles 16/24 as §5.3 says); weights as tokens; `--icon-sm` and `--icon-md`; `ProgressBar busy` and `BarList` (§4.6); `ViewSwitch` and the icon option of `SegmentedFilter`; `SavedViewsMenu`; `SummaryCard to` (LinkSummaryCard retired) and every row of figures a `StatStrip`; `Tag` and `LevelTag other`; `RelativeTime`, `TooltipText` and a `Tooltip` that opens on a tap, no native `title` tooltips; one `ConvertedAmount` naming its rate (§3.2, §3.6, §4.4, §4.6, §5.2, §5.3, §5.4, §5.6). |
| 2.13 | 12 Nov 2026 | D-423, the last copies move into `ui/`: one `SaveViewDialog` and one `ManageViewsPanel` (with its Rename view dialog) for All work and the reports, their differences as props; `FormErrorSummary` `onGo` and `describe` for the dashboard builder; `NumberField` for bounded whole numbers; `Drawer` for the navigation drawer (§5.1, §5.3, §5.5, §5.8). |
| 2.14 | 12 Nov 2026 | D-421, one filter pattern: `FilterBar` (search · quick control · Filters (n) · count and view switches; the folding row of filter menus, opening by itself when a filter is in use; chips with Clear filters; state in the address, written in place), `YearRangeMenu` (moved from All work) and `DateRangeMenu`; every toolbar control 32 px (`SearchField size="sm"` and `delay`, `FiltersButton` `sm` by default); no counts in a list's status filter; the chosen segment keeps the group's borders (§3.6, §5.2). |
| 2.15 | 12 Nov 2026 | D-424, our own date picker: `DateField` and `DateRangeField` are a text input in the person's format (typed dates read in that format, dd/mm/yyyy or yyyy-mm-dd) with a **Choose date** button opening `ui/DatePicker` — month grid from Monday, Month and Year jump, today outlined, the chosen day yellow-filled, days outside the range refused with the reason, Today and Clear, the WAI-ARIA date picker keyboard; no native date input remains; `DateRangeMenu` links From and To in the calendar; All work's Month calendar shares the calendar core; **More filters** is `ui/AttributeFilterMenu`; the address is written through `ui/useAddressParams` (§4.5, §5.2, §5.5). |
