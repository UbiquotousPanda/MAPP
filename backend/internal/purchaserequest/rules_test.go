package purchaserequest

import (
	"testing"

	"mapp/internal/approval"
)

func TestSubmissionOf_031_FR024(t *testing.T) {
	t.Parallel()
	submit, resubmit := approval.SubmissionSubmit, approval.SubmissionResubmit
	tests := []struct {
		name string
		pr   PurchaseRequest
		kind RoundKind
		want string
	}{
		{"created submits", PurchaseRequest{Status: StatusCreated}, KindPurchaseRequest, submit},
		{"declined re-submits", PurchaseRequest{Status: StatusDeclined}, KindPurchaseRequest, resubmit},
		{"in review re-submits", PurchaseRequest{Status: StatusInReview}, KindPurchaseRequest, resubmit},
		{"approved has no first submission", PurchaseRequest{Status: StatusApproved}, KindPurchaseRequest, ""},
		{"approved submits changes", PurchaseRequest{Status: StatusApproved}, KindModification, submit},
		{"changes in review re-submit", PurchaseRequest{Status: StatusInReview, ChangePending: true}, KindModification, resubmit},
		{"no first-round re-submit while changes are in review", PurchaseRequest{Status: StatusInReview, ChangePending: true},
			KindPurchaseRequest, ""},
		{"no changes while the first round is open", PurchaseRequest{Status: StatusSubmitted}, KindModification, ""},
		{"closed submits nothing", PurchaseRequest{Status: StatusClosed}, KindModification, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := submissionOf(tt.pr, tt.kind); got != tt.want {
				t.Errorf("submissionOf = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestSaveSteps_032_FR039(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name         string
		pr           PurchaseRequest
		lines        LinesOnApproved
		step, adding string
	}{
		{"created saves", PurchaseRequest{Status: StatusCreated}, NotAllowed, ThenSave, ThenSave},
		{"in a round re-submits", PurchaseRequest{Status: StatusSubmitted}, NotAllowed, ThenResubmit, ThenResubmit},
		{"approved submits changes", PurchaseRequest{Status: StatusApproved}, WithModificationApproval, ThenSubmitChanges,
			ThenSubmitChanges},
		{"approved saves added lines without approval", PurchaseRequest{Status: StatusApproved}, WithoutApproval,
			ThenSubmitChanges, ThenSave},
		{"approved adds no lines when the setting forbids", PurchaseRequest{Status: StatusApproved}, NotAllowed,
			ThenSubmitChanges, ""},
		{"a change in review adds no lines when forbidden", PurchaseRequest{Status: StatusInReview, ChangePending: true},
			NotAllowed, ThenResubmit, ""},
		{"closed saves nothing", PurchaseRequest{Status: StatusClosed}, WithoutApproval, "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			step, adding := saveSteps(tt.pr, Configuration{LinesOnApproved: tt.lines})
			if step != tt.step || adding != tt.adding {
				t.Errorf("saveSteps = %q, %q; want %q, %q", step, adding, tt.step, tt.adding)
			}
		})
	}
}
