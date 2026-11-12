# Tasks: A Purchase Request Needs the SWBS Code First (058)

**Input**: [spec.md](spec.md) · decision D-405

Format: `[ID] [P?] [Story] Description` — `[P]` can run in parallel (different files).

## Phase 1: Spec and documents

- [x] T001 Spec and these tasks in `specs/058-pr-needs-swbs-code/`
- [x] T002 D-405 in `docs/sdd/decision-log.md`; 058 in `docs/sdd/feature-map.md`; amendment note under 032 FR-002;
  domain model §2.4a "SWBS code first"; PR-1001's note in `docs/product/demo-users-and-data.md`

## Phase 2: User Story 1 — raise a purchase request only once the line item has its SWBS code (P1)

- [x] T003 [US1] `purchaserequest`: messages `msgNeedsSwbs` and `msgNoSwbsYet`; `needsSwbs` and `noSwbsYet` with the
  SWBS state words of the submission gate (`readiness.go`)
- [x] T004 [US1] `checker.lineItem` refuses a new line (no stored id) on a line item without an SWBS code, with every
  other problem (FR-002); stored lines are not checked
- [x] T005 [US1] `Defaults` answers the same validation error (FR-003); `LineItemSection.Create` unavailable with the
  reason after permission, Purchase Support and what is left (FR-004)
- [x] T006 [P] [US1] Web app: `FormPageFailed` shows a validation refusal's message with Go to plans, no Try again
  (FR-003)
- [x] T007 [US1] Contract tests `handler_swbs_test.go` (section before and after the code, create refused, then
  saved); `TestDefaults_Contract` (pre-fill refused); `PurchaseRequestCreatePage.test.tsx` (the refusal page)

## Phase 3: User Story 2 — add lines only for line items with their SWBS code (P1)

- [x] T008 [US2] The Add line picker's reason for a line item without an SWBS code (FR-004), after the existing ones
- [x] T009 [US2] Contract tests: a new line on Agency fee refused; PR-1001's stored line without a code keeps saving;
  `TestOptions_PickerReasons` names Agency fee's reason; the submission gate test runs on PR-1001 (FR-006)

## Phase 4: User Story 3 — the planning view offers only line items with their SWBS code (P2)

- [x] T010 [US3] Contract `SpaLineItemRow.raisePurchaseRequest`; `pnpm run api:types`
- [x] T011 [US3] `spa.Record.Swbs` from the planning node; `raiseForLineItem`: the activity's availability first, then
  the SWBS code (FR-005); `TestRaise_EachLineItemNeedsItsSwbsCode`
- [x] T012 [P] [US3] `ActivityRow`'s Raise menu disables a line item with its reason; `SpaPage.test.tsx`

## Phase 5: Existing tests and journeys

- [x] T013 Contract tests that raised purchase requests on line items without a code get it first
  (`receiveSwbsCodes`, `mediaBookingWithCode`)
- [x] T014 End-to-end: `purchase-requests.spec.ts` checks the section's reason, sends to the simulated GSAP, then
  raises (058 US1); `overspend-control.spec.ts` and `qa-findings-pr-delete.spec.ts` send to GSAP before raising;
  `swbsLineItem` sends the new line item for approval and has Daniel approve it, as 053 needs before the SWBS
  request is Ready to send (the journeys broke on `demo` when 053 merged); "GSAP rates as of" sits on the grey
  page background of a purchase request, so it uses Text Strong (`RatesAsOfNote.module.css`, axe colour contrast)
- [x] T015 `go vet`, `golangci-lint` on the changed lines, `go test -short ./...`, `pnpm run check`, the affected
  end-to-end specs
