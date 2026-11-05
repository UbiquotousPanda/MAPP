package purchaserequest_test

import (
	"net/http"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/internal/purchaserequest"
)

func fieldNames(e apiError) []string {
	var names []string
	for _, f := range e.Error.Fields {
		names = append(names, f.Field)
	}
	return names
}

func TestSubmit_ChecksTheStoredValuesAgain_Contract_032_FR021_D404(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, field string
		change      alteration
	}{
		{"an inactive owner", "ownerId", deactivatePerson(meisID)},
		{"an inactive MoA approver", "moaApproverId", deactivatePerson(danielsID)},
		{"an inactive currency", "lines[0].currency", deactivateCurrency("EUR")},
		{"an inactive attribute option", "attributes.SA-1050", deactivateOption(deLubes)},
		{"a line item with less left than the amount", "lines[0].amount", lowerLineItemCost(standBuild)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s, db := onDemoData(t)
			receiveSwbsCodes(t, s)
			priya := s.SignIn(t, priyasEmail)
			b := body(standBuild, "EUR", "9200.00")
			b["ownerId"] = meisID
			pr := create(t, priya, b)
			tt.change(t, db)

			check := decoded[purchaserequest.SubmissionView](t, priya.Do(t, http.MethodGet, prs+"/"+pr.ID+"/approval/submission", nil),
				http.StatusOK)
			refused := decoded[apiError](t, priya.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/submit",
				map[string]any{"version": pr.Version}), http.StatusConflict)

			var listed []string
			for _, p := range check.Problems {
				listed = append(listed, p.Field)
			}
			same(t, "032 D-404 the refusal and the check name the field",
				[]any{"not_ready", true, true, false, purchaserequest.StatusCreated},
				[]any{refused.Error.Code, slices.Contains(fieldNames(refused), tt.field), slices.Contains(listed, tt.field), check.Ready,
					get(t, priya, pr.ID).Status})
		})
	}
}

func TestSaveAndResubmit_ShowsFieldAndReadinessProblemsTogether_Contract_032_FR053_D404(t *testing.T) {
	t.Parallel()
	s := apitest.New(t)
	receiveSwbsCodes(t, s)
	priya := s.SignIn(t, priyasEmail)
	pr := create(t, priya, body(standBuild, "EUR", "9200.00"))
	decoded[purchaserequest.ApprovalView](t, priya.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/submit",
		map[string]any{"version": pr.Version}), http.StatusOK)
	submitted := get(t, priya, pr.ID)
	b := saveBody(submitted, "0", "resubmit")
	b["lines"].([]map[string]any)[0]["lineItemId"] = mediaBooking

	refused := decoded[apiError](t, priya.Do(t, http.MethodPut, prs+"/"+pr.ID, b), http.StatusConflict)

	same(t, "032 D-404 one answer holds both lists", []any{"not_ready", true, true, true},
		[]any{refused.Error.Code, slices.Contains(fieldNames(refused), "lines[0].amount"), len(refused.Error.Missing) > 0,
			get(t, priya, pr.ID).Version == submitted.Version})
}

func TestApprove_ChecksTheStoredValuesAgain_Contract_032_FR021_D404(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, wantField string
		wantMissing     bool
		change          alteration
	}{
		{name: "the activity left approval", wantMissing: true, change: leaveApproval("A-1003")},
		{name: "the owner became inactive", wantField: "ownerId", change: deactivatePerson(meisID)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s, db := onDemoData(t)
			receiveSwbsCodes(t, s)
			priya, daniel := s.SignIn(t, priyasEmail), s.SignIn(t, danielsEmail)
			b := body(standBuild, "EUR", "9200.00")
			b["ownerId"] = meisID
			pr := create(t, priya, b)
			at := decoded[purchaserequest.ApprovalView](t, priya.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/submit",
				map[string]any{"version": pr.Version}), http.StatusOK)
			tt.change(t, db)
			round := openRound(t, at)

			refused := decoded[apiError](t, daniel.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/approve",
				map[string]any{"roundId": round.ID, "level": round.CurrentLevel}), http.StatusConflict)
			declined := decide(t, daniel, "decline", at)

			namesField := tt.wantField == "" || slices.Contains(fieldNames(refused), tt.wantField)
			listsRecords := !tt.wantMissing || len(refused.Error.Missing) > 0
			same(t, "032 D-404 refused with the problems, then declined",
				[]any{"not_ready", true, true, purchaserequest.StatusDeclined},
				[]any{refused.Error.Code, namesField, listsRecords, declined.Status})
		})
	}
}

func TestApprove_LeavesOutWhatOnlyASubmissionNeeds_Contract_032_FR021_D404(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, submissionWouldSay string
		change                   alteration
	}{
		{"its workflow was made inactive", "Choose an active approval workflow", deactivateWorkflow("WF-1004")},
		{"its activity's line items cost more than planned and the setting only warns", "exceed its planned cost",
			lowerPlannedCost("A-1003")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			s, db := onDemoData(t)
			receiveSwbsCodes(t, s)
			priya, daniel := s.SignIn(t, priyasEmail), s.SignIn(t, danielsEmail)
			pr := create(t, priya, body(standBuild, "EUR", "9200.00"))
			at := decoded[purchaserequest.ApprovalView](t, priya.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/submit",
				map[string]any{"version": pr.Version}), http.StatusOK)
			tt.change(t, db)
			check := decoded[purchaserequest.SubmissionView](t, priya.Do(t, http.MethodGet, prs+"/"+pr.ID+"/approval/submission", nil),
				http.StatusOK)

			done := decide(t, daniel, "approve", at)

			var said bool
			for _, p := range check.Problems {
				said = said || strings.Contains(p.Message, tt.submissionWouldSay)
			}
			same(t, "032 D-404 a submission refuses what the open round's approval leaves out", []any{true, purchaserequest.StatusApproved},
				[]any{said, done.Status})
		})
	}
}

func TestApproveChange_ChecksTheStoredValuesAgain_Contract_032_FR036_D404(t *testing.T) {
	t.Parallel()
	s, db := onDemoData(t)
	pr := approved(t, s)
	priya, daniel := s.SignIn(t, priyasEmail), s.SignIn(t, danielsEmail)
	decoded[purchaserequest.View](t, priya.Do(t, http.MethodPut, prs+"/"+pr.ID, saveBody(pr, "8000.00", "submitChanges")), http.StatusOK)
	at := decoded[purchaserequest.ApprovalView](t, priya.Do(t, http.MethodGet, prs+"/"+pr.ID+"/approval", nil), http.StatusOK)
	leaveApproval("A-1003")(t, db)
	round := openRound(t, at)

	refused := decoded[apiError](t, daniel.Do(t, http.MethodPost, prs+"/"+pr.ID+"/approval/approve",
		map[string]any{"roundId": round.ID, "level": round.CurrentLevel}), http.StatusConflict)
	declined := decide(t, daniel, "decline", at)

	same(t, "032 D-404 the change is refused, then declined back to its approved values",
		[]any{"not_ready", true, purchaserequest.StatusApproved},
		[]any{refused.Error.Code, len(refused.Error.Missing) > 0, declined.Status})
}
