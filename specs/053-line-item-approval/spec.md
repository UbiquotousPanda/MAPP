# Feature Specification: Line-Item Approval — Tick the Line Items You Approve

**Feature Branch**: `053-line-item-approval`

**Created**: 2026-11-05

**Status**: Built (2026-11-05)

**Input**: After the demo dry run of 5 November 2026, Shell's leads asked that an approver approving an
activity can tick or untick each of its line items. The integrator decided (D-402): unticked line items stay
**Not approved** while the activity is approved; a line item added after the activity is approved also needs
approval, and goes to the approver on its own while the activity stays Approved.

**Amends**: 008 FR-014, FR-015 and FR-032 (the approver decides per line item; the preview shows each line
item's approval) · 030 (the SWBS request is ready once the line item, not only its activity, is approved) ·
032 FR-021 (the activity gate also applies per line item) · 034 FR-001 (line-item changes still keep the
activity's approval; a new line item starts Not approved) · domain model §2.4 · D-322 and D-324 in part
(D-402). Measure's 041 FR-024 ("the engine does not approve line items") needs its own amendment — a follow-up
for the Measure module, not changed here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Approve an activity without some of its line items (Priority: P1)

An approver deciding an activity's round sees its line items with checkboxes, all ticked. They untick the ones
they do not agree with and approve. The activity is approved; the unticked line items stay **Not approved**:
no SWBS code is requested for them and they cannot be on a purchase request.

**Independent test**: approve a submitted activity with two line items, untick one; the activity is Approved,
the ticked line item is Approved with its SWBS request Ready to send, the unticked one Not approved and Waiting
for approval.

**Acceptance scenarios**

1. **Given** an activity waiting at the last level with line items L1 and L2, **when** the approver opens
   Approve, **then** the dialog lists L1 and L2, each with a checkbox labelled with its ID, name and planned
   cost, both ticked.
2. **Given** that dialog, **when** the approver unticks L2 and approves, **then** the activity is Approved, L1
   is Approved and L2 is Not approved, each shown as a chip on the activity's line items, and the activity's
   log entry names L2 as not approved.
3. **Given** a two-level round, **when** level 1 unticks L2 and approves, **then** level 2 sees L2 unticked
   with "Not approved at an earlier level" and cannot tick it, and L1 ticked.
4. **Given** L2 Not approved with "Request SWBS code" on, **then** its SWBS request is Waiting for approval and
   the simulated GSAP run does not send it; L1's is Ready to send to GSAP.
5. **Given** L2 Not approved, **when** its owner submits a purchase request with a line for L2, **then** the
   submission is refused with "Line item L2 '…' is not approved." among its problems.
6. **Given** an approver approving without saying which line items (an older client), **then** every line item
   of the round is approved, as before this feature.

### User Story 2 — Send new or unticked line items for approval (Priority: P1)

The owner of an approved activity adds a line item, or has one left unticked. Each is Not approved. The owner
sends the activity's Not approved line items for approval; a round on the activity's workflow asks the
approvers about just those line items, while the activity stays Approved.

**Independent test**: add a line item to an approved activity, send it for approval, approve it as the
approver; the line item becomes Approved and the activity never leaves Approved.

**Acceptance scenarios**

1. **Given** an approved activity, **when** its owner adds a line item, **then** the line item is Not approved
   and the activity is still Approved.
2. **Given** an approved activity with Not approved line items and no open round, **then** its Approval section
   offers **Send line items for approval**; the confirmation names each line item that will be sent, the levels
   and approvers, and takes an optional comment.
3. **Given** the line items were sent, **then** the activity stays Approved, the level's approvers are told, and
   the round waits in their **Waiting for me** list.
4. **Given** that round, **when** the approver opens Approve, **then** only the round's line items have
   checkboxes, all ticked; approving at the last level makes the ticked ones Approved and leaves the unticked
   ones Not approved.
5. **Given** that round, **when** the approver declines it or the owner recalls it, **then** the activity stays
   Approved, its line items stay Not approved, and they can be sent again.
6. **Given** an approved activity whose line items are all Approved, **then** Send line items for approval is
   not offered.

### Edge cases

- **Restart**: a change to an approved activity's planned cost or dates restarts its approval (D-322); its
  line items show Not approved until the activity is approved again, and an open round for line items ends as
  restarted with it.
- **Line item deleted while waiting** drops out of the round; brought back, it keeps the approval it had when
  deleted (one deleted before this feature comes back Not approved).
- **Line item added while a round is open** waits for the next round: it is not part of a line-item round, and
  in the activity's own round it is listed for the levels still to decide.
- **Every line item unticked**: allowed; the round is approved and they all stay Not approved.
- **Stale selection**: ticking a line item the round no longer decides (deleted, or unticked at an earlier
  level) is refused with "Reload the page …", nothing saved.
- **Copies** (duplicate, copy activity or plan, import, Split activity) start Not approved.

## Requirements *(mandatory)*

- **FR-001**: Approving a level of an activity's open round MUST show the line items the round decides, each
  with a checkbox labelled with its ID, name and planned cost, ticked by default. A round of the activity
  itself decides all the activity's line items; a line-item round (FR-008) only its own.
- **FR-002**: A line item an earlier decision of the same round left unticked MUST be shown unticked, not
  tickable, with "Not approved at an earlier level"; ticking it, or a line item the round does not decide, MUST
  be refused (400 `approvedLineItemIds`) and save nothing.
- **FR-003**: Unticking MUST NOT change how the round moves: levels, all-or-any modes, delegations,
  notifications and the activity's status follow 008, 017 and 031 unchanged. The decision's activity-log entry
  MUST name the line items it leaves unticked.
- **FR-004**: When the round is approved (at its last level or automatically), every line item it decides
  MUST become **Approved** unless an approver of the round left it unticked, which MUST be **Not approved**.
  Each change MUST write one activity-log entry on the line item.
- **FR-005**: A line item MUST show its approval — **Approved** or **Not approved** — as a chip on the
  activity's line items, its own page and the approver's preview. It is Approved only while its activity is
  approved (also when shown In progress or Complete).
- **FR-006**: A line item created, duplicated, copied, imported or moved by Split activity MUST start Not
  approved. Editing a line item MUST keep its approval (D-322).
- **FR-007**: A line item's SWBS request MUST be **Ready to send to GSAP** only while the line item is
  Approved, and **Waiting for approval** while it is Not approved (030's other states unchanged). A purchase
  request with a line for a Not approved line item MUST NOT be submitted: 032 FR-021's gates list
  "Line item <ID> '<name>' is not approved."
- **FR-008**: An approved activity with at least one Not approved line item and no open round MUST offer
  **Send line items for approval** to whoever may submit it. It sends all of its Not approved line items in one
  round on the activity's workflow, with the activity's submission check, rules and approvers (008, 017, 031),
  confirmed first as Submit is (008 FR-008), with an optional comment. The activity MUST stay Approved.
- **FR-009**: A line-item round MUST be decided, declined, recalled and listed as any round of the activity.
  Its decline or recall MUST leave the activity Approved and its line items Not approved.
- **FR-010**: A restart of an approved activity's approval (D-322) MUST end its open line-item round as
  restarted.
- **FR-011**: Line items of activities approved before this feature MUST be Approved, so existing data behaves
  as before.
- **FR-012**: The approve request (`DecisionRequest`) MUST accept `approvedLineItemIds`; without it every line
  item the round decides is approved. Purchase requests ignore it.

## Assumptions for Shell's leads

1. **Multi-level rounds**: a line item unticked at any level stays Not approved for the rest of that round;
   later levels see it unticked and cannot tick it (the most careful approver wins).
2. **All unticked**: an approver may approve an activity with every line item unticked.
3. **Declined, recalled or restarted activity**: its line items are Not approved until the activity is
   approved again; the next approval of the activity decides every line item again, all ticked by default.
4. **One round for all waiting line items**: Send line items for approval sends every Not approved line item;
   while that round is open nothing else can be sent (the owner can recall it and send again).
5. **Same workflow and approvers**: a line-item round uses the activity's workflow, with its rules evaluated
   on the activity's facts (planned cost, type, business units), so it reaches the same approvers.
6. **Editing an approved line item**, its planned cost included, keeps it Approved (D-322 applies per line
   item).
7. **Recycle bin**: a restored line item keeps the approval it had when deleted.

## Out of scope

Approving a line item outside a round; workflows of their own for line items; Measure reports (041 Approvals
report, 044 GSAP link) — listed as follow-ups.

## Success criteria

- **SC-001**: An approver approves an activity without one of its line items in one dialog, with no extra
  step.
- **SC-002**: No Not approved line item reaches the simulated GSAP run or a submitted purchase request.
- **SC-003**: Every activity approved before this feature behaves as before.
