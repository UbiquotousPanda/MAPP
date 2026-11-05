package lineitem

import (
	"testing"

	"mapp/internal/history"
)

func (f *fixture) approval(t *testing.T, id string) string {
	t.Helper()
	details, err := f.service.Get(t.Context(), priya, id)
	if err != nil {
		t.Fatalf("Get(%s): %v", id, err)
	}
	return details.LineItem.Approval
}

func (f *fixture) setApproval(t *testing.T, choice ApprovalChoice) {
	t.Helper()
	if err := f.service.SetApproval(t.Context(), alex, choice); err != nil {
		t.Fatalf("SetApproval: %v", err)
	}
}

func approvalEntries(entries []history.Entry) map[string]string {
	verbs := map[string]string{}
	for _, e := range entries {
		if _, newer := verbs[e.RecordID]; !newer && e.Action == history.ActionStatusChanged {
			verbs[e.RecordID] = e.Verb
		}
	}
	return verbs
}

func TestSetApproval_ActivityRoundDecidesEveryLineItem_053_FR004(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	venue := f.create(t, priya, socialOnAir, input("Venue hire", "GBP", "15800"))
	speakers := f.create(t, priya, socialOnAir, input("Speakers", "GBP", "2000"))

	f.setApproval(t, ApprovalChoice{ActivityID: socialOnAir, HeldBack: []string{speakers.ID}, Round: 2})

	if got := f.approval(t, venue.ID); got != ApprovalApproved {
		t.Errorf("ticked line item = %s, want approved", got)
	}
	if got := f.approval(t, speakers.ID); got != ApprovalNotApproved {
		t.Errorf("unticked line item = %s, want notApproved", got)
	}
	verbs := approvalEntries(f.log(t))
	if len(verbs) != 1 || verbs[venue.ID] != "approved" {
		t.Errorf("approval log entries = %v, want one 'approved' for %s", verbs, venue.ID)
	}
}

func TestSetApproval_LaterRoundUnticksAnApprovedLineItem_053_FR004(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	venue := f.create(t, priya, socialOnAir, input("Venue hire", "GBP", "15800"))
	f.setApproval(t, ApprovalChoice{ActivityID: socialOnAir, Round: 1})

	f.setApproval(t, ApprovalChoice{ActivityID: socialOnAir, HeldBack: []string{venue.ID}, Round: 2})

	if got := f.approval(t, venue.ID); got != ApprovalNotApproved {
		t.Errorf("line item = %s, want notApproved", got)
	}
	if verbs := approvalEntries(f.log(t)); verbs[venue.ID] != "set to not approved" {
		t.Errorf("latest approval entry = %q, want 'set to not approved'", verbs[venue.ID])
	}
}

func TestSetApproval_LineItemRoundDecidesOnlyItsOwn_053_FR004(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	venue := f.create(t, priya, socialOnAir, input("Venue hire", "GBP", "15800"))
	speakers := f.create(t, priya, socialOnAir, input("Speakers", "GBP", "2000"))
	catering := f.create(t, priya, socialOnAir, input("Catering", "GBP", "900"))

	f.setApproval(t, ApprovalChoice{ActivityID: socialOnAir, Only: []string{speakers.ID, catering.ID},
		HeldBack: []string{catering.ID}, Round: 3})

	got := []string{f.approval(t, venue.ID), f.approval(t, speakers.ID), f.approval(t, catering.ID)}
	if got[0] != ApprovalNotApproved || got[1] != ApprovalApproved || got[2] != ApprovalNotApproved {
		t.Errorf("venue, speakers, catering = %v; want notApproved (not in the round), approved, notApproved", got)
	}
}

func TestApprovalOf_OnlyWhileTheActivityIsApproved_053_FR005(t *testing.T) {
	t.Parallel()
	approved := LineItem{Approved: true}
	tests := []struct {
		name   string
		li     LineItem
		status string
		want   string
	}{
		{"approved line item of an approved activity", approved, "approved", ApprovalApproved},
		{"approved line item of an activity back to created", approved, "created", ApprovalNotApproved},
		{"approved line item of a submitted activity", approved, "submitted", ApprovalNotApproved},
		{"not approved line item of an approved activity", LineItem{}, "approved", ApprovalNotApproved},
	}
	for _, tt := range tests {
		if got := ApprovalOf(tt.li, tt.status); got != tt.want {
			t.Errorf("%s: %s, want %s", tt.name, got, tt.want)
		}
	}
}
