package purchaserequest

import (
	"slices"
	"testing"
)

func TestGates_NotApprovedLineItem_053_FR007(t *testing.T) {
	t.Parallel()
	facts := map[string]LineItemFacts{
		"L-1007": {ID: "L-1007", Name: "Print ads", ActivityID: "A-1003", ActivityName: "Billboard winter wave",
			ActivityStatus: "approved", SwbsStatus: "waitingForApproval", CompanyCode: "GB01"},
	}
	pr := PurchaseRequest{ID: "PR-1", Lines: []Line{{LineItemID: "L-1007"}}}

	var got []string
	for _, p := range activityGates(pr, facts) {
		got = append(got, p.Message)
	}

	want := []string{
		"Line item L-1007 'Print ads' is not approved.",
		"Line item L-1007 'Print ads' has no SWBS code yet (Waiting for approval).",
	}
	if !slices.Equal(got, want) {
		t.Errorf("gates = %q, want %q", got, want)
	}
}
