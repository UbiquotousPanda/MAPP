# Tasks: Line-Item Approval (053)

**Input**: [spec.md](spec.md) · decision D-402 · domain model §2.4

Format: `[ID] [P?] [Story] Description` — `[P]` can run in parallel (different files).

## Phase 1: Spec and documents

- [x] T001 Spec, assumptions for Shell's leads and these tasks in `specs/053-line-item-approval/`
- [x] T002 D-402 in `docs/sdd/decision-log.md`; 053 in `docs/sdd/feature-map.md`; domain model §2.4 amended

## Phase 2: Foundation (blocks both stories)

- [x] T003 Migration `00037_line_item_approval.sql`: `line_items.approval` (`approved` · `notApproved`, CHECK),
  set to `approved` for line items of approved activities (FR-011); `approval_rounds.line_item_ids` and
  `held_back_line_item_ids` (`text[]`, held back ⊆ asked when the round asks about line items) — numbered after
  the measure module's 00030–00036 so neither branch renumbers
- [x] T004 Queries in `line_items.sql` and `approval_rounds.sql`; `sqlc generate` and `sqlc vet`
- [x] T005 Contract `backend/api/openapi.yaml`: `DecisionRequest.approvedLineItemIds`, `LineItem.approval`,
  `ApprovalPreviewLineItem.approval`, `ActivityApproval.lineItems`, `ApprovalRound.lineItemIds`,
  `ActionSet.sendLineItems`, `Submission.kind` `lineItems` and `Submission.lineItems`; `pnpm run api:types`
- [x] T006 `lineitem.LineItem.Approved` stored by the PostgreSQL store and both fakes; copies, Split moves and the
  demo seed (approved activities' line items Approved)

## Phase 3: User Story 1 — tick the line items you approve (P1)

- [x] T007 [US1] `approval`: a decision's selection holds back unticked line items on the round, refuses a stale
  one (FR-001 – FR-003); the round's approval approves the rest through `Activities.SetLineItemApproval`
  (FR-004)
- [x] T008 [US1] `lineitem.Service.SetApproval` writes each line item's approval with its log entry (FR-004)
- [x] T009 [US1] Approval per line item: `lineitem.IsApproved`, SWBS status (FR-007), the line item's
  `approval` (FR-005), the preview's line items, purchase-request gate per line item (FR-007)
- [x] T010 [US1] Web: checkboxes in the Approve dialog, held-back line items explained (FR-001, FR-002);
  Approved / Not approved chip on line items and in the preview (FR-005)
- [x] T011 [US1] Tests: approval selection and held-back rules, line-item approval and log, SWBS status, PR
  gate, contract test of the approve request, dialog and chip tests

## Phase 4: User Story 2 — send line items for approval (P1)

- [x] T012 [US2] `approval`: submission kind `lineItems` for an approved activity with Not approved line items
  and no open round; the round lists them; the activity's status never moves for it; decline and recall leave
  it Approved; a restart ends the open line-item round (FR-008 – FR-010)
- [x] T013 [US2] Web: **Send line items for approval** in the Approval section, its confirmation naming the
  line items (FR-008)
- [x] T014 [US2] Tests: sending, deciding, declining, recalling and restarting a line-item round; the action's
  availability; the confirmation

## Phase 5: Polish

- [x] T015 Touched Go packages and web tests green; `pnpm run typecheck`; `scripts/check-changed.ps1`

## Follow-ups (not in this feature)

- Measure 041 Approvals report: FR-024 says the engine does not approve line items; line-item rounds are
  counted as rounds of their activity — decide whether the report shows them apart.
- Measure 044 GSAP link: check its SWBS readiness follows the line item's approval.
- An end-to-end test of US1 and US2 against PostgreSQL (the e2e suite was not run on this laptop).
