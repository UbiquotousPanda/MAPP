package approval

import (
	"slices"
	"testing"

	"mapp/internal/platform/errs"
)

func stillOpen(t *testing.T, f *fixture) {
	t.Helper()
	if round, found := openRound(f.rounds(t, purchaseRequestA)); !found || round.CurrentLevel != 1 {
		t.Errorf("the round is no longer open at level 1: %+v", round)
	}
}

func TestDecideSubject_ChecksThePurchaseRequestAgain_032_FR021_D404(t *testing.T) {
	t.Parallel()
	refusal := errs.NotReadyWithFields("This purchase request can't be approved as it stands.",
		[]errs.FieldError{{Field: "ownerId", Message: "Choose an active person."}},
		[]errs.ReadinessGroup{{Record: errs.RecordRef{Type: "activity", ID: "A-1003", Name: "Billboard winter wave"},
			Fields: []errs.MissingField{{Reason: "Activity 'Billboard winter wave' must be approved first."}}}})
	for _, kind := range []SubjectKind{KindPurchaseRequest, KindModifiedPurchaseRequest} {
		t.Run(string(kind), func(t *testing.T) {
			t.Parallel()
			f, prs := newPurchaseFixture(t, purchaseRequest{workflow: prFlow, modification: prChangesFlow},
				kindFlow(prFlow, KindPurchaseRequest, named(daniel)), kindFlow(prChangesFlow, KindModifiedPurchaseRequest, named(daniel)))
			if kind == KindModifiedPurchaseRequest {
				f.submitPR(t, KindPurchaseRequest)
				f.mustDecide(t, daniel, ActionApproved, "")
			}
			f.submitPR(t, kind)
			prs.checked, prs.refusals[purchaseRequestA] = nil, refusal

			_, refused := f.decideSubject(t, daniel, ActionApproved, "")

			assertError(t, refused, refusal)
			stillOpen(t, f)
			if _, err := f.decideSubject(t, daniel, ActionDeclined, "Fix the owner first"); err != nil {
				t.Errorf("032 D-404 a decline is never refused, got %v", err)
			}
			if want := []string{purchaseRequestA}; !slices.Equal(prs.checked, want) {
				t.Errorf("032 D-404 checks run = %v, want one, for the approval only: %v", prs.checked, want)
			}
		})
	}
}

func TestApprove_Activity_IsNotCheckedAsAPurchaseRequest_031_FR025(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	prs := f.usePurchases(t)
	f.addActivity(t, "A-1009", "Fleet card launch", mei.ID, lubricantsFlow)
	f.submit(t, mei, "A-1009", "")

	approved := f.approve(t, daniel, "A-1009", "")

	if approved.Status != StatusApproved || len(prs.checked) != 0 {
		t.Errorf("approved activity = %s with %v purchase-request checks, want none", approved.Status, prs.checked)
	}
}
