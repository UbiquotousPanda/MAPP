package approval

import (
	"reflect"
	"strings"
	"testing"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

const fleet = "A-1009"

// fleetWithLineItems is Fleet card launch, Created, with the line items L-1 and L-2, neither approved.
func fleetWithLineItems(t *testing.T) *fixture {
	t.Helper()
	f := newFixture(t)
	f.addActivity(t, fleet, "Fleet card launch", mei.ID, chinaFlow)
	facts := f.activities.facts[fleet]
	facts.LineItems = []LineItemFact{lineItem("L-1"), lineItem("L-2")}
	f.activities.facts[fleet] = facts
	return f
}

func lineItem(id string) LineItemFact {
	return LineItemFact{ID: id, Name: "Item " + id, PlannedCost: money.USD(money.FromCents(100000))}
}

func (f *fixture) approveTicking(t *testing.T, a actor.Actor, ticked ...string) (ActivityApproval, error) {
	t.Helper()
	round := f.openRound(t, fleet)
	return f.service.Approve(t.Context(), a, fleet, DecisionInput{RoundID: round.ID, Level: version(round.CurrentLevel),
		ApprovedLineItemIDs: append([]string{}, ticked...)})
}

func (f *fixture) approvedLineItems() string {
	var approved []string
	for _, li := range f.activities.facts[fleet].LineItems {
		if li.Approved {
			approved = append(approved, li.ID)
		}
	}
	return strings.Join(approved, ", ")
}

// approvedFleet is Fleet card launch approved with L-1 ticked and L-2 left unticked, as after US1.
func approvedFleet(t *testing.T) *fixture {
	t.Helper()
	f := fleetWithLineItems(t)
	f.submit(t, mei, fleet, "")
	if _, err := f.approveTicking(t, carlos, "L-1"); err != nil {
		t.Fatalf("level 1: %v", err)
	}
	f.approve(t, alex, fleet, "")
	return f
}

func TestApprove_UntickedLineItemStaysNotApproved_053_US1(t *testing.T) {
	t.Parallel()
	f := fleetWithLineItems(t)
	submitted := f.submit(t, mei, fleet, "")
	want := []RoundLineItem{{ID: "L-1", Name: "Item L-1", PlannedCost: lineItem("L-1").PlannedCost},
		{ID: "L-2", Name: "Item L-2", PlannedCost: lineItem("L-2").PlannedCost}}
	if !reflect.DeepEqual(submitted.LineItems, want) {
		t.Fatalf("scenario 1: line items = %+v, want both, ticked", submitted.LineItems)
	}

	levelOne, err := f.approveTicking(t, carlos, "L-1")
	if err != nil || !levelOne.LineItems[1].HeldBack || levelOne.LineItems[0].HeldBack {
		t.Fatalf("scenario 3: level 1 = %+v, %v; want L-2 held back for level 2", levelOne.LineItems, err)
	}
	last := f.approve(t, alex, fleet, "")

	if last.Status != StatusApproved || f.approvedLineItems() != "L-1" {
		t.Errorf("scenario 2: activity %s, approved line items %q; want Approved with only L-1", last.Status, f.approvedLineItems())
	}
	if entry := f.log(t, fleet)[1]; !strings.Contains(entry.Details, "not approved: L-2") {
		t.Errorf("level 1's log details = %q, want the unticked L-2 named", entry.Details)
	}
}

func TestApprove_RefusesAStaleSelection_053_FR002(t *testing.T) {
	t.Parallel()
	f := fleetWithLineItems(t)
	f.submit(t, mei, fleet, "")
	if _, err := f.approveTicking(t, carlos, "L-1"); err != nil {
		t.Fatalf("level 1: %v", err)
	}

	for _, ticked := range []string{"L-2", "L-9"} {
		_, err := f.approveTicking(t, alex, "L-1", ticked)
		want := errs.Validation(errs.FieldError{Field: approvedLineItemsField,
			Message: "Line item " + ticked + " is not waiting for this approval. Reload the page and try again."})
		assertError(t, err, want)
	}
	if round := f.openRound(t, fleet); round.CurrentLevel != 2 || len(round.HeldBack) != 1 {
		t.Errorf("round = level %d, held back %v; want still at level 2 with L-2 held back", round.CurrentLevel, round.HeldBack)
	}
}

func TestApprove_WithoutSelectionApprovesEveryLineItem_053_FR012(t *testing.T) {
	t.Parallel()
	f := fleetWithLineItems(t)
	f.submit(t, mei, fleet, "")
	f.approve(t, carlos, fleet, "")
	f.approve(t, alex, fleet, "")

	if got := f.approvedLineItems(); got != "L-1, L-2" {
		t.Errorf("approved line items = %q, want L-1, L-2", got)
	}
}

func TestSendLineItems_OfferedForNotApprovedLineItems_053_US2_2(t *testing.T) {
	t.Parallel()
	f := approvedFleet(t)

	section, err := f.service.Approval(t.Context(), mei, fleet)
	preview, err2 := f.service.Submission(t.Context(), mei, fleet)

	if err != nil || !section.Actions.SendLineItems.Available || section.Actions.Submit.Available {
		t.Errorf("actions = %+v, %v; want Send line items for approval only", section.Actions, err)
	}
	if err2 != nil || preview.Kind != kindLineItems || len(preview.LineItems) != 1 || preview.LineItems[0].ID != "L-2" {
		t.Errorf("submission %s %+v, %v; want lineItems naming L-2", preview.Kind, preview.LineItems, err2)
	}
}

func TestSendLineItems_RoundForNotApprovedLineItems_053_US2_3(t *testing.T) {
	t.Parallel()
	f := approvedFleet(t)

	sent := f.submit(t, mei, fleet, "")

	if round := f.openRound(t, fleet); sent.Status != StatusApproved || !reflect.DeepEqual(round.LineItemIDs, []string{"L-2"}) {
		t.Fatalf("scenario 3: activity %s, round's line items %v; want Approved and a round for L-2", sent.Status, round.LineItemIDs)
	}
	assertNotified(t, f, carlos, "approvalNeeded: Approval needed — Mei Lin sent line items L-2 of 'Fleet card launch' (A-1009) for approval",
		"approvalNeeded: Approval needed — Mei Lin submitted 'Fleet card launch' (A-1009)")
	if rows, err := f.service.Inbox(t.Context(), carlos, "waiting"); err != nil || len(rows) != 1 {
		t.Errorf("scenario 3: Waiting for me = %d rows, %v; want the line items' round", len(rows), err)
	}
	f.approve(t, carlos, fleet, "")
	done := f.approve(t, alex, fleet, "")
	if done.Status != StatusApproved || f.approvedLineItems() != "L-1, L-2" || done.Actions.SendLineItems.Available {
		t.Errorf("scenario 4: activity %s, approved %q; want still Approved, both approved, nothing to send", done.Status, f.approvedLineItems())
	}
}

func TestSendLineItems_DeclineOrRecallKeepsActivityApproved_053_US2_5(t *testing.T) {
	t.Parallel()
	for _, end := range []string{"decline", "recall"} {
		f := approvedFleet(t)
		f.submit(t, mei, fleet, "")
		var after ActivityApproval
		var err error
		if end == "decline" {
			after = f.decline(t, carlos, fleet, "Not this one.")
		} else {
			after, err = f.service.Recall(t.Context(), mei, fleet, RecallInput{RoundID: f.openRound(t, fleet).ID})
		}
		if err != nil || after.Status != StatusApproved || f.approvedLineItems() != "L-1" || !after.Actions.SendLineItems.Available {
			t.Errorf("%s: activity %s, approved %q, %v; want still Approved, L-2 to send again", end, after.Status, f.approvedLineItems(), err)
		}
	}
}

func TestSendLineItems_NothingToSend_053_US2_6(t *testing.T) {
	t.Parallel()
	f := fleetWithLineItems(t)
	f.submit(t, mei, fleet, "")
	f.approve(t, carlos, fleet, "")
	done := f.approve(t, alex, fleet, "")

	if done.Actions.SendLineItems.Available || done.Actions.Submit.Available {
		t.Errorf("actions = %+v, want nothing to send or submit", done.Actions)
	}
}

func TestRestart_EndsTheLineItemsRound_053_FR010(t *testing.T) {
	t.Parallel()
	f := approvedFleet(t)
	f.submit(t, mei, fleet, "")
	round := f.openRound(t, fleet)

	if err := f.service.ApprovalRestarted(t.Context(), mei, fleet, StatusApproved, nil); err != nil {
		t.Fatalf("ApprovalRestarted: %v", err)
	}

	if _, open := openRound(f.rounds(t, fleet)); open {
		t.Errorf("round %s still open, want it ended as restarted", round.ID)
	}
}
