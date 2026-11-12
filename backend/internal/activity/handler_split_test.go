package activity_test

import (
	"net/http"
	"reflect"
	"slices"
	"strings"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/history"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/errs"
)

// Demo data: A-1011 of the GBP plan P-1004 in I-1009 (40,000.00 GBP, 01 Mar – 31 May 2027) holds L-1009 15,000.00 GBP
// and L-1010 23,000.00 EUR = 19,166.67 GBP; I-1010 "Ireland" holds A-1012 "Dealer conference".

const (
	ukLaunchEvent = "A-1011"
	ukInitiative  = "I-1009"
	irelandInit   = "I-1010"
	venueItem     = "L-1009"
	agencyItem    = "L-1010"
)

func splitBody(name, initiativeID string, lineItemIDs []string, plannedCost any, restart bool, version int) map[string]any {
	if lineItemIDs == nil {
		lineItemIDs = []string{}
	}
	return map[string]any{
		"name": name, "initiativeId": initiativeID, "lineItemIds": lineItemIDs, "plannedCost": plannedCost,
		"restartApproval": restart, "version": version,
	}
}

// Amounts in GBP, "UK launch event (split)" suggested, the plan's initiatives offered with its own first.
func TestSplitOptions_Contract_FR026(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/activities/"+ukLaunchEvent+"/split-options", nil)

	assertStatus(t, response, http.StatusOK)
	var options activity.SplitOptions
	response.Decode(t, &options)
	if options.PlanCurrency != "GBP" || options.SuggestedName != "UK launch event (split)" || options.NeedsRestart ||
		options.PlannedCost.Format() != "40,000.00 GBP" || len(options.LineItems) != 2 ||
		options.LineItems[1].PlannedCost.Format() != "23,000.00 EUR" || options.LineItems[1].PlannedCostPlan.Format() != "19,166.67 GBP" {
		t.Errorf("options = %s", response.Body)
	}
	if len(options.Destinations) != 2 || options.Destinations[0].Initiative.ID != ukInitiative || options.Destinations[0].MoveProblem != nil ||
		options.Destinations[1].Initiative.ID != irelandInit || options.Destinations[1].MoveProblem != nil {
		t.Errorf("destinations = %+v", options.Destinations)
	}
}

// Original 20,833.33 GBP with 5,833.33 unassigned, new one 19,166.67 GBP with 0.00 unassigned; the split then
// gives the same figures, keeps L-1010's ID and links both activities.
func TestSplitPreview_MatchesSplit_FR027(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	body := splitBody("Ireland roadshow", irelandInit, []string{agencyItem}, "19166.67", false, 1)

	previewed := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split-preview", body)

	assertStatus(t, previewed, http.StatusOK)
	var preview activity.SplitPreview
	previewed.Decode(t, &preview)
	if len(preview.Problems) != 0 || preview.Original == nil || preview.Created == nil {
		t.Fatalf("preview = %s", previewed.Body)
	}
	o, c := preview.Original, preview.Created
	if o.PlannedCost.Format() != "20,833.33 GBP" || o.UnassignedPlannedCost.Format() != "5,833.33 GBP" || o.UnassignedState != "left" ||
		!slices.Equal(o.LineItemNames, []string{"Venue"}) || o.Status != activity.StatusCreated || o.InitiativeName != "UK" {
		t.Errorf("original side = %+v", o)
	}
	if c.PlannedCost.Format() != "19,166.67 GBP" || c.UnassignedPlannedCost.Format() != "0.00 GBP" || c.UnassignedState != "allAssigned" ||
		!slices.Equal(c.LineItemNames, []string{"Agency fee (Ireland)"}) || c.Name != "Ireland roadshow" || c.InitiativeName != "Ireland" {
		t.Errorf("created side = %+v", c)
	}

	split := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split", body)

	assertStatus(t, split, http.StatusCreated)
	var result activity.SplitResult
	split.Decode(t, &result)
	original, created := result.Activity, result.NewActivity
	if original.PlannedCost.Format() != "20,833.33 GBP" || original.UnassignedPlannedCost.Format() != "5,833.33 GBP" ||
		original.LineItems.Count != 1 || len(original.SplitInto) != 1 || original.SplitInto[0].ID != created.ID {
		t.Errorf("original = %+v", original)
	}
	if created.ID != "A-1014" || created.Name != "Ireland roadshow" || created.Initiative.ID != irelandInit ||
		created.PlannedCost.Format() != "19,166.67 GBP" || created.UnassignedPlannedCost.Format() != "0.00 GBP" ||
		created.LineItems.Count != 1 || created.SplitFrom == nil ||
		*created.SplitFrom != (activity.SplitLink{ID: ukLaunchEvent, Name: "UK launch event", PlanID: "P-1004"}) {
		t.Errorf("new activity = %+v (split from %+v)", created, created.SplitFrom)
	}
	var moved struct {
		LineItem struct{ ID, ActivityID string } `json:"lineItem"`
	}
	priya.Do(t, http.MethodGet, "/api/v1/line-items/"+agencyItem, nil).Decode(t, &moved)
	if moved.LineItem.ID != agencyItem || moved.LineItem.ActivityID != created.ID {
		t.Errorf("L-1010 after the split = %+v, want it under %s", moved.LineItem, created.ID)
	}
}

// A split moves amounts, never creates or loses them.
func TestSplit_SumsUnchanged_SC005(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	type plan struct {
		PlanFigures struct {
			PlannedCost struct{ Amount, Currency string } `json:"plannedCost"`
		} `json:"planFigures"`
		Contents struct{ Activities, LineItems int } `json:"contents"`
	}
	var before, after plan
	priya.Do(t, http.MethodGet, "/api/v1/plans/P-1004", nil).Decode(t, &before)

	split := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split",
		splitBody("Ireland roadshow", irelandInit, []string{agencyItem}, "12000.00", false, 1))

	assertStatus(t, split, http.StatusCreated)
	priya.Do(t, http.MethodGet, "/api/v1/plans/P-1004", nil).Decode(t, &after)
	if before.PlanFigures.PlannedCost != after.PlanFigures.PlannedCost || after.PlanFigures.PlannedCost.Amount != "65000.00" ||
		before.Contents.LineItems != after.Contents.LineItems || after.Contents.Activities != before.Contents.Activities+1 {
		t.Errorf("before %+v, after %+v", before, after)
	}
}

// Nothing ticked and 0.00 to move: the preview lists the problem and the split refuses it, changing nothing.
func TestSplit_NothingChosen_FR027(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	body := splitBody("Ireland roadshow", irelandInit, nil, "0", false, 1)

	previewed := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split-preview", body)
	refused := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split", body)

	var preview activity.SplitPreview
	previewed.Decode(t, &preview)
	want := []errs.FieldError{{Field: "lineItemIds", Message: "Choose line items or an amount to move."}}
	if !reflect.DeepEqual(preview.Problems, want) {
		t.Errorf("preview problems = %+v, want %+v", preview.Problems, want)
	}
	assertAnswer(t, refused, http.StatusBadRequest, `{"error":{"code":"validation_failed","message":"Some fields need your attention.",`+
		`"fields":[{"field":"lineItemIds","message":"Choose line items or an amount to move."}]}}`)
}

// Every refusal names its field: line items of another activity, an amount above the planned cost, a name
// already in the destination (ignoring letter case), another plan's initiative and one whose dates do not fit.
func TestSplit_Refusals_FR026(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	tests := []struct {
		activityID string
		body       map[string]any
		fields     string
	}{
		{ukLaunchEvent, splitBody("Ireland roadshow", irelandInit, []string{"L-1001"}, "50000", false, 1),
			`{"field":"lineItemIds","message":"L-1001 is not a line item of this activity."},` +
				`{"field":"plannedCost","message":"Move at most 40,000.00 GBP, the activity's planned cost."}`},
		{ukLaunchEvent, splitBody("dealer CONFERENCE", irelandInit, []string{agencyItem}, nil, false, 1),
			`{"field":"name","message":"'Ireland' already has an activity called 'Dealer conference'."}`},
		{"A-1001", splitBody("Launch film part 2", ukInitiative, nil, "1000", false, 1),
			`{"field":"initiativeId","message":"Choose another initiative of this plan."}`},
		{"A-1001", splitBody("Launch film part 2", "I-1004", nil, "1000", false, 1),
			`{"field":"initiativeId","message":"'Launch film' runs 01 Mar – 31 May 2026, but 'Retail events' runs ` +
				`01 Jun – 31 Dec 2026. Change the activity's dates first, or pick another initiative."}`},
	}

	for _, tt := range tests {
		refused := priya.Do(t, http.MethodPost, "/api/v1/activities/"+tt.activityID+"/split", tt.body)
		assertAnswer(t, refused, http.StatusBadRequest, `{"error":{"code":"validation_failed","message":"Some fields need your attention.",`+
			`"fields":[`+tt.fields+`]}}`)
	}
	var page activity.SplitOptions
	priya.Do(t, http.MethodGet, "/api/v1/activities/A-1001/split-options", nil).Decode(t, &page)
	for _, d := range page.Destinations {
		if d.Initiative.ID == "I-1004" && d.MoveProblem == nil {
			t.Errorf("Retail events is offered without its dates reason: %+v", d)
		}
	}
}

// Type, owner, dates, workflow, description, external name and Shell attributes are copied; status Created.
func TestSplit_CreatesCopyOfFieldsWithoutGoals_FR028(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	var original activity.View
	priya.Do(t, http.MethodGet, "/api/v1/activities/A-1001", nil).Decode(t, &original)

	split := priya.Do(t, http.MethodPost, "/api/v1/activities/A-1001/split",
		splitBody("Launch film (split)", "I-1001", nil, "20000.00", false, original.Version))

	assertStatus(t, split, http.StatusCreated)
	var result activity.SplitResult
	split.Decode(t, &result)
	n := result.NewActivity
	if n.ActivityType.ID != original.ActivityType.ID || !reflect.DeepEqual(n.Owner, original.Owner) ||
		!reflect.DeepEqual(n.StartDate, original.StartDate) || !reflect.DeepEqual(n.EndDate, original.EndDate) ||
		!reflect.DeepEqual(n.ApprovalWorkflow, original.ApprovalWorkflow) || n.Description != original.Description ||
		n.ExternalName != original.ExternalName || !reflect.DeepEqual(n.Attributes, original.Attributes) {
		t.Errorf("new activity %+v does not copy %+v", n, original)
	}
	if n.Goals.INQ != nil || n.Goals.MQL != nil || n.Goals.Revenue != nil || n.Status != activity.StatusCreated ||
		n.PlannedCost.Format() != "20,000.00 USD" || result.Activity.PlannedCost.Format() != "100,000.00 USD" {
		t.Errorf("new activity goals %+v, status %s, planned %v; original planned %v", n.Goals, n.Status, n.PlannedCost, result.Activity.PlannedCost)
	}
	if !reflect.DeepEqual(result.Activity.Goals, original.Goals) {
		t.Errorf("the original's goals changed: %+v, want %+v", result.Activity.Goals, original.Goals)
	}
}

// The moved line item is ready to send no more, because its new activity is Created.
func TestSplit_ApprovedNeedsRestart_FR029(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	var options activity.SplitOptions
	priya.Do(t, http.MethodGet, "/api/v1/activities/A-1002/split-options", nil).Decode(t, &options)
	if !options.NeedsRestart {
		t.Fatalf("options = %+v, want needsRestart", options)
	}

	unconfirmed := priya.Do(t, http.MethodPost, "/api/v1/activities/A-1002/split",
		splitBody("Speakers", "I-1001", []string{"L-1004"}, "5000.00", false, options.Version))
	confirmed := priya.Do(t, http.MethodPost, "/api/v1/activities/A-1002/split",
		splitBody("Speakers", "I-1001", []string{"L-1004"}, "5000.00", true, options.Version))

	assertAnswer(t, unconfirmed, http.StatusBadRequest, `{"error":{"code":"validation_failed","message":"Some fields need your attention.",`+
		`"fields":[{"field":"restartApproval","message":"This activity will need approval again — confirm the change to save it."}]}}`)
	assertStatus(t, confirmed, http.StatusCreated)
	var result activity.SplitResult
	confirmed.Decode(t, &result)
	if result.Activity.Status != activity.StatusCreated || result.NewActivity.Status != activity.StatusCreated ||
		result.Activity.PlannedCost.Format() != "75,000.00 USD" {
		t.Errorf("after the split: original %s %v, new %s", result.Activity.Status, result.Activity.PlannedCost, result.NewActivity.Status)
	}
	var moved struct {
		LineItem struct{ SwbsStatus string } `json:"lineItem"`
	}
	priya.Do(t, http.MethodGet, "/api/v1/line-items/L-1004", nil).Decode(t, &moved)
	if moved.LineItem.SwbsStatus == "readyToSend" {
		t.Errorf("L-1004 SWBS = %s, want it to follow its new Created activity", moved.LineItem.SwbsStatus)
	}
}

// Logged on the original (what moved, planned cost old → new), the new activity ("Split from …") and each moved line item.
func TestSplit_Logs_FR030(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	split := priya.Do(t, http.MethodPost, "/api/v1/activities/"+ukLaunchEvent+"/split",
		splitBody("Ireland roadshow", irelandInit, []string{agencyItem}, "19750.00", false, 1))
	assertStatus(t, split, http.StatusCreated)

	var page history.LogPage
	priya.Do(t, http.MethodGet, "/api/v1/activity-log?limit=10", nil).Decode(t, &page)
	var lines []string
	for _, e := range page.Items {
		line := strings.TrimSpace(string(e.Action) + " " + e.Verb + " " + e.RecordID + " " + e.Details)
		for _, c := range e.Changes {
			line += " | " + c.Label + ": " + c.OldText + " → " + c.NewText
		}
		lines = append(lines, strings.TrimSpace(line))
	}
	want := []string{
		"changed split A-1011 Into 'Ireland roadshow' (A-1014): 1 line item and 19,750.00 GBP | Planned cost: 40,000.00 GBP → 20,250.00 GBP",
		"moved moved L-1010 | Activity: 'UK launch event' (A-1011) → 'Ireland roadshow' (A-1014)",
		"created created A-1014 Split from 'UK launch event' (A-1011)",
	}
	if len(lines) < 3 || !slices.Equal(lines[:3], want) {
		t.Errorf("log =\n%s\nwant first\n%s", strings.Join(lines, "\n"), strings.Join(want, "\n"))
	}
}
