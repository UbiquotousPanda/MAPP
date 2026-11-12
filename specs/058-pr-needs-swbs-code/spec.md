# Feature Specification: A Purchase Request Needs the SWBS Code First

**Feature Branch**: `058-pr-needs-swbs-code`

**Created**: 2026-11-12

**Status**: Built (2026-11-12)

**Input**: Product owner instruction of 2026-11-12: "I should not be able to create a PR before getting a SWBS
code. First I should have the SWBS code, then only I would be able to create a PR." Decision D-405: a purchase
request, and every line added to one, draws only on line items that have received their SWBS code from GSAP.
This follows Shell's process as the functional analysis describes it (FA A4, D3: the line item is approved, its
SWBS code is requested, then the purchase request is raised) and closes the gap where a purchase request could
reserve a line item's money weeks before GSAP could ever accept it.

**Amends**: client 013 User Story 1 scenario 4 ("a PR on a line item with no SWBS code is saved Created") —
superseded · 032 FR-001 and FR-002 (a line item is eligible only once it has its SWBS code) · 032 FR-010 (the
picker lists line items without one as unavailable, with the reason) · 032 FR-021 (the submission gate on the
SWBS code stays, for purchase requests raised before this feature) · D-349 in part ("raising and saving the
purchase request … stay allowed" now holds only for lines whose line item has its SWBS code) · the SP&A planning
view's Raise purchase request (013 FR-022, feature 036).

**Words used here**: a line item *has its SWBS code* when GSAP (the simulated GSAP, 030) has returned one for
it — its SWBS request reads "SWBS code received". The other SWBS states are "Request SWBS code is off",
"Waiting for approval" and "Ready to send to GSAP" (030, 053).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Raise a purchase request only once the line item has its SWBS code (Priority: P1)

A marketer opens a line item whose activity is approved but whose SWBS code has not come back from GSAP. Its
Purchase requests section says why New purchase request is not offered. Once the simulated GSAP returns the
code, New purchase request is offered and the purchase request is raised as before.

**Independent test**: on an approved activity's line item with "Request SWBS code" on and no code, New purchase
request is unavailable with the reason; run the simulated GSAP; New purchase request is offered and the purchase
request saves as Created.

**Acceptance scenarios**

1. **Given** line item L-1006 "Stand build" with its SWBS request "Ready to send to GSAP", **when** Priya opens
   its Purchase requests section, **then** New purchase request is not offered and the section reads "No SWBS
   code yet (Ready to send to GSAP). A purchase request needs the line item's SWBS code first."
2. **Given** the simulated GSAP has returned L-1006's SWBS code, **when** Priya chooses New purchase request and
   saves the pre-filled form, **then** the purchase request is saved Created with one line on L-1006.
3. **Given** a line item with no SWBS code, **when** anyone opens New purchase request for it (for example from
   an old link), **then** the page shows "Line item L-1006 'Stand build' has no SWBS code yet (Ready to send to
   GSAP). A purchase request needs its SWBS code first." with Go to plans, and offers no form and no Try again.
4. **Given** a line item with no SWBS code, **when** a client sends a new purchase request with a line on it,
   **then** nothing is saved and the answer is a validation error on that line's line item with the message of
   scenario 3, together with every other problem of the request.

### User Story 2 — Add lines only for line items with their SWBS code (Priority: P1)

A marketer adds a line to a purchase request. The picker shows line items without an SWBS code as unavailable,
with the reason, next to the other unavailable ones. Lines already saved on a purchase request raised before this
feature keep saving; only its submission still waits for their codes.

**Independent test**: open Add line on a Created purchase request; a line item without an SWBS code is listed as
unavailable with "No SWBS code yet (…)"; a line item with its code can be chosen and saved.

**Acceptance scenarios**

1. **Given** a purchase request on L-1003 "Venue hire" (SWBS code received), **when** Priya searches the Add line
   picker for "Speaker fees" (L-1004, Request SWBS code off), **then** L-1004 is listed as unavailable with "No
   SWBS code yet (Request SWBS code is off). A purchase request needs the line item's SWBS code first."
2. **Given** that purchase request, **when** a client saves it with a new line on L-1004, **then** nothing is saved
   and the line's line item has the message of User Story 1 scenario 3.
3. **Given** PR-1001, raised on L-1010 before this feature and L-1010 still without a code, **when** Priya changes
   its description and saves, **then** it saves; **when** she submits it, **then** it is refused naming L-1010 and
   its SWBS state (032 FR-021, unchanged).
4. **Given** an approved purchase request whose change adds a line, **then** the new line follows the same rule
   (Submit changes saves the change like any other save).

### User Story 3 — The planning view offers only line items with their SWBS code (Priority: P2)

On the SP&A planning view, an activity's Raise purchase request menu lists its line items; those without an SWBS
code are shown unavailable with the reason, and an activity none of whose line items has one says so.

**Independent test**: open the planning view of a plan with an approved activity whose two line items are one with
and one without an SWBS code; the menu offers the first and shows the second unavailable with the reason.

**Acceptance scenarios**

1. **Given** an activity with L1 (SWBS code received) and L2 ("Waiting for approval"), **when** the planner opens
   Raise purchase request, **then** "Raise purchase request for L1" opens New purchase request for L1 and "Raise
   purchase request for L2" is unavailable with "No SWBS code yet (Waiting for approval). A purchase request
   needs the line item's SWBS code first."
2. **Given** an activity whose line items all lack an SWBS code, **then** each is listed unavailable with its
   reason, so the planner sees which line items need what.

### Edge cases

- **A line item's code arrives while the form is open**: the save re-reads the line item; the line saves.
- **Purchase requests raised before this feature** on line items without a code (the seed's PR-1001 on L-1010):
  they stay, open, edit and save as before; their lines without a code cannot be submitted (032 FR-021) until GSAP
  returns the codes. No data is changed.
- **Removing a line, or changing a stored line's amount, delivery date or attributes**: allowed whatever the
  line item's SWBS state — the rule is about drawing on a line item, not about lines already drawn.
- **Purchase Support off, nothing left to request, another company code, already on this request**: their
  reasons keep coming first, as today; the SWBS reason shows when it is the only one, so the person is told the
  first thing to fix.
- **A Not approved line item of an approved activity (053)**: it gets no SWBS code, so the rule already keeps it
  off new purchase requests; its reason reads "No SWBS code yet (Waiting for approval)".

## Requirements *(mandatory)*

- **FR-001**: System MUST treat a line item as eligible for a new purchase request, or a new line on one, only when
  it has its SWBS code, in addition to 032 FR-002.
- **FR-002**: System MUST refuse to save a purchase request with a new line on a line item without an SWBS code —
  create, save, save and re-submit, and submit changes alike — with "Line item <ID> '<name>' has no SWBS code yet
  (<SWBS state>). A purchase request needs its SWBS code first." on that line's line item, reported with every
  other problem at once. Stored lines are not checked by this rule.
- **FR-003**: System MUST answer New purchase request's pre-fill for a line item without an SWBS code with that
  validation error, and the page MUST show the message with Go to plans instead of a form or Try again.
- **FR-004**: The line item's Purchase requests section MUST not offer New purchase request while the line item has
  no SWBS code, and MUST show "No SWBS code yet (<SWBS state>). A purchase request needs the line item's SWBS code
  first."; the Add line picker MUST list such line items as unavailable with the same reason.
- **FR-005**: The SP&A planning view MUST give each line item of an activity's Raise purchase request menu its own
  availability, unavailable with the reason of FR-004 while it has no SWBS code; the activity's own availability
  (permission, Purchase Support, a line item at all) still comes first.
- **FR-006**: The submission gate on the SWBS code (032 FR-021) MUST stay unchanged.

## Success criteria

- **SC-001**: No purchase request or line saved after this feature draws on a line item without an SWBS code.
- **SC-002**: Every place that starts a purchase request — the line item's section, New purchase request, Add line
  and the planning view — tells the person, before they fill anything in, that the line item needs its SWBS code.

## Out of scope

- Changing purchase requests raised before this feature, or the seed's PR-1001.
- Requesting the SWBS code from the purchase request screens: it is still requested on the line item and sent by
  the simulated GSAP run (030).
