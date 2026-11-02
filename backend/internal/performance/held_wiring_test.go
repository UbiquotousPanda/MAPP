package performance_test

import (
	"net/http"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/money"
	"mapp/internal/settings"
)

// Social always-on (A-1002) is Approved in the demo data, so the facts loaded for it arrive released.
const approvedActivity = "A-1002"

func releasedFacts(t *testing.T, alex *apitest.Client) {
	t.Helper()
	sourceID := preparedSource(t, alex)
	file := "Ref,Date,Activity,INQs\nr1,2026-02-01," + approvedActivity + ",5\n"
	decoded[importAnswer](t, alex.Do(t, http.MethodPost, "/api/v1/performance/sources/"+sourceID+"/uploads", uploadBody(file)),
		http.StatusCreated)
	if held := heldFlags(t, alex); len(held) != 1 || held[0] {
		t.Fatalf("before the change held = %v, want one released fact", held)
	}
}

func heldFlags(t *testing.T, alex *apitest.Client) []bool {
	t.Helper()
	page := decoded[struct {
		Items []struct {
			Held bool `json:"held"`
		} `json:"items"`
	}](t, alex.Do(t, http.MethodGet, "/api/v1/activities/"+approvedActivity+"/performance/facts", nil), http.StatusOK)
	flags := make([]bool, 0, len(page.Items))
	for _, f := range page.Items {
		flags = append(flags, f.Held)
	}
	return flags
}

// editOf is the edit form of an activity that sets no later-stage goals itself, as the web app sends it.
func editOf(v activity.View) activity.Update {
	update := activity.Update{
		Name: v.Name, ExternalName: v.ExternalName, ActivityTypeID: v.ActivityType.ID, Ongoing: v.Ongoing,
		Description: v.Description, Attributes: settings.AttributeValues{}, Version: &v.Version,
		Goals: activity.GoalsInput{INQ: v.Goals.INQ}, RestartApproval: true,
	}
	for id, value := range v.Attributes {
		update.Attributes[id] = value
	}
	if v.Owner != nil {
		update.OwnerID = &v.Owner.ID
	}
	start, end := v.StartDate.String(), v.EndDate.String()
	update.StartDate, update.EndDate = &start, &end
	if v.ApprovalWorkflow != nil {
		update.ApprovalWorkflowID = &v.ApprovalWorkflow.ID
	}
	return update
}

func TestUpdateActivity_ReapprovalEditHoldsReleasedFactsAgain_FR020(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	releasedFacts(t, alex)
	var view activity.View
	alex.Do(t, http.MethodGet, "/api/v1/activities/"+approvedActivity, nil).Decode(t, &view)
	edit := editOf(view)
	edit.PlannedCost = &money.Input{Amount: "81000.00", Currency: "USD"}

	saved := decoded[activity.View](t, alex.Do(t, http.MethodPatch, "/api/v1/activities/"+approvedActivity, edit), http.StatusOK)

	if held := heldFlags(t, alex); saved.Status != activity.StatusCreated || len(held) != 1 || !held[0] {
		t.Errorf("after a planned-cost change: status %s, held = %v; want Created and the fact held again", saved.Status, held)
	}
}

func TestSplitActivity_ReapprovalSplitHoldsReleasedFactsAgain_FR020(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	releasedFacts(t, alex)
	var options activity.SplitOptions
	alex.Do(t, http.MethodGet, "/api/v1/activities/"+approvedActivity+"/split-options", nil).Decode(t, &options)

	split := alex.Do(t, http.MethodPost, "/api/v1/activities/"+approvedActivity+"/split", map[string]any{
		"name": "Speakers", "initiativeId": "I-1001", "lineItemIds": []string{"L-1004"}, "plannedCost": "5000.00",
		"restartApproval": true, "version": options.Version,
	})

	if held := heldFlags(t, alex); split.Status != http.StatusCreated || len(held) != 1 || !held[0] {
		t.Errorf("after a split: status %d, held = %v; want 201 and the original's fact held again", split.Status, held)
	}
}
