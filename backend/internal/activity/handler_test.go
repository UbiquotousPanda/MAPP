package activity_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/activity"
	"mapp/internal/history"
	"mapp/internal/platform/apitest"
)

// Contract tests check the parts of each answer the operation is about; the service tests prove the rules.

const priyasEmail = "priya.raman@shell.com"

const (
	activityGoneBody   = `{"error":{"code":"not_found","message":"This activity no longer exists — someone may have deleted it.","fields":[]}}`
	initiativeGoneBody = `{"error":{"code":"not_found","message":"This initiative no longer exists — someone may have deleted it.","fields":[]}}`
	planGoneBody       = `{"error":{"code":"not_found","message":"This plan no longer exists — someone may have deleted it.","fields":[]}}`
)

func TestNewActivityForm_Contract_FR001(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/initiatives/I-1001/activity-form", nil)

	var form activity.FormView
	assertStatus(t, response, http.StatusOK)
	response.Decode(t, &form)
	if form.Context.Initiative.Name != "Digital & social" || form.Defaults == nil || form.Defaults.Owner.Name != "Priya Raman" ||
		len(form.ActivityTypes) != 5 || len(form.ApprovalWorkflows) != 3 || len(form.Attributes) != 20 {
		t.Errorf("form = %+v", form)
	}
	assertAnswer(t, priya.Do(t, http.MethodGet, "/api/v1/initiatives/I-9999/activity-form", nil), http.StatusNotFound, initiativeGoneBody)
}

func TestCreateActivity_Contract_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	created := priya.Do(t, http.MethodPost, "/api/v1/initiatives/I-1001/activities", map[string]any{
		"name": "Launch video", "activityTypeId": "AT-1002", "plannedCost": map[string]string{"amount": "25000.00", "currency": "USD"},
	})
	refused := priya.Do(t, http.MethodPost, "/api/v1/initiatives/I-1001/activities", map[string]any{
		"name": "launch film", "activityTypeId": "AT-1006", "startDate": "2026-05-01", "endDate": "2026-04-01",
	})
	gone := priya.Do(t, http.MethodPost, "/api/v1/initiatives/I-9999/activities", map[string]any{"name": "Launch video", "activityTypeId": "AT-1002"})

	var view activity.View
	assertStatus(t, created, http.StatusCreated)
	created.Decode(t, &view)
	// A-1013 sits in the recycle bin with the demo history's deleted initiative; A-1011 and A-1012 are on the GBP plan.
	if view.ID != "A-1014" || view.Status != activity.StatusCreated || view.PlannedCost.Format() != "25,000.00 USD" {
		t.Errorf("created = %+v", view)
	}
	assertAnswer(t, refused, http.StatusBadRequest, `{"error":{"code":"validation_failed","message":"Some fields need your attention.","fields":[`+
		`{"field":"name","message":"'Digital `+"\\u0026"+` social' already has an activity called 'Launch film'."},`+
		`{"field":"activityTypeId","message":"Choose an activity type that the model 'Lubricants 1.0' allows."},`+
		`{"field":"endDate","message":"End date must be on or after the start date (01 May 2026)."}]}}`)
	assertAnswer(t, gone, http.StatusNotFound, initiativeGoneBody)
}

// Rows are ordered by start date, then name, without dates last.
func TestListPlanActivities_Contract_FR033(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	server.GrantRole(t, priyasEmail, "globalPlanner", "all") // every market's plans

	response := priya.Do(t, http.MethodGet, "/api/v1/plans/P-1002/activities", nil)

	var page activity.SummaryPage
	assertStatus(t, response, http.StatusOK)
	response.Decode(t, &page)
	var rows []string
	for _, item := range page.Items {
		rows = append(rows, item.ID+" "+string(item.DisplayStatus))
	}
	if want := []string{"A-1008 created", "A-1009 submitted", "A-1010 created"}; !slices.Equal(rows, want) || page.Total != 3 {
		t.Errorf("rows = %q (total %d), want %q", rows, page.Total, want)
	}
	assertAnswer(t, priya.Do(t, http.MethodGet, "/api/v1/plans/P-9999/activities", nil), http.StatusNotFound, planGoneBody)
}

// A-1001 "Launch film" has three needed fields empty.
func TestGetActivity_Contract_FR019(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/activities/A-1001", nil)

	var view activity.View
	assertStatus(t, response, http.StatusOK)
	response.Decode(t, &view)
	var messages []string
	for _, p := range view.Readiness.Activity {
		messages = append(messages, p.Message)
	}
	want := []string{"Company code — needed to submit", "Cost centre — needed to submit", "PIR — needed to submit"}
	if view.Completeness.MissingFields != 3 || !slices.Equal(messages, want) || view.DisplayStatus != activity.DisplayCreated ||
		view.Goals.Revenue.Format() != "2,500,000.00 USD" || view.Plan.Name != "FY2026 Lubricants Europe" {
		t.Errorf("A-1001 = %+v", view)
	}
	assertAnswer(t, priya.Do(t, http.MethodGet, "/api/v1/activities/A-9999", nil), http.StatusNotFound, activityGoneBody)
}

// The edit form leaves the activity's own name out of the names in use.
func TestEditActivityForm_Contract_FR013(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)

	response := priya.Do(t, http.MethodGet, "/api/v1/activities/A-1001/form", nil)

	var form activity.FormView
	assertStatus(t, response, http.StatusOK)
	response.Decode(t, &form)
	if form.Defaults != nil || !slices.Equal(form.ExistingNames, []string{"Social always-on"}) {
		t.Errorf("form defaults %+v, names %q", form.Defaults, form.ExistingNames)
	}
	assertAnswer(t, priya.Do(t, http.MethodGet, "/api/v1/activities/A-9999/form", nil), http.StatusNotFound, activityGoneBody)
}

// A re-approval change on a Submitted activity needs restartApproval.
func TestUpdateActivity_Contract_FR026(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	daniel := server.SignIn(t, "daniel.okoro@shell.com")
	var a1004 activity.View
	priya.Do(t, http.MethodGet, "/api/v1/activities/A-1004", nil).Decode(t, &a1004)
	form := formOf(a1004)
	form.PlannedCost = usdInput("35000.00")

	refused := priya.Do(t, http.MethodPatch, "/api/v1/activities/A-1004", form)
	form.RestartApproval = true
	saved := priya.Do(t, http.MethodPatch, "/api/v1/activities/A-1004", form)
	outOfDate := daniel.Do(t, http.MethodPatch, "/api/v1/activities/A-1004", form)

	assertAnswer(t, refused, http.StatusBadRequest, `{"error":{"code":"validation_failed","message":"Some fields need your attention.",`+
		`"fields":[{"field":"restartApproval","message":"This activity will need approval again — confirm the change to save it."}]}}`)
	var view activity.View
	assertStatus(t, saved, http.StatusOK)
	saved.Decode(t, &view)
	if view.Status != activity.StatusCreated || view.Version != 2 || view.PlannedCost.Format() != "35,000.00 USD" {
		t.Errorf("saved = status %s, version %d, cost %v", view.Status, view.Version, view.PlannedCost)
	}
	assertAnswer(t, outOfDate, http.StatusConflict, `{"error":{"code":"version_conflict","message":"Not saved — Priya Raman changed this activity",`+
		`"fields":[],"conflict":{"changedBy":"Priya Raman","changedAt":"2026-03-12T09:00:00Z"}}}`)
	assertAnswer(t, priya.Do(t, http.MethodPatch, "/api/v1/activities/A-9999", form), http.StatusNotFound, activityGoneBody)
}

func TestDeleteActivity_ThenUndo_Contract_FR031(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	before := priya.Do(t, http.MethodGet, "/api/v1/activities/A-1002", nil)

	deleted := priya.DeleteSeen(t, "/api/v1/activities/A-1002")
	gone := priya.Do(t, http.MethodGet, "/api/v1/activities/A-1002", nil)

	var result history.DeleteResult
	assertStatus(t, deleted, http.StatusOK)
	deleted.Decode(t, &result)
	entry := result.RecycleBinEntry
	if entry.RecordType != "activity" || entry.RecordID != "A-1002" || entry.RecordName != "Social always-on" ||
		entry.Parent == nil || entry.Parent.ID != "I-1001" {
		t.Errorf("recycle-bin entry = %+v", entry)
	}
	assertAnswer(t, gone, http.StatusNotFound, activityGoneBody)
	undone := priya.Do(t, http.MethodPost, "/api/v1/recycle-bin/"+entry.ID+"/undo", nil)
	assertStatus(t, undone, http.StatusOK)
	assertAnswer(t, priya.Do(t, http.MethodGet, "/api/v1/activities/A-1002", nil), http.StatusOK, string(before.Body))
	assertAnswer(t, priya.DeleteSeen(t, "/api/v1/activities/A-9999"), http.StatusNotFound, activityGoneBody)
}

func assertStatus(t *testing.T, r *apitest.Response, status int) {
	t.Helper()
	if r.Status != status {
		t.Fatalf("status = %d %s, want %d", r.Status, r.Body, status)
	}
}

func assertAnswer(t *testing.T, r *apitest.Response, status int, body string) {
	t.Helper()
	if r.Status != status || string(r.Body) != body {
		t.Errorf("answer = %d %s\nwant     %d %s", r.Status, r.Body, status, body)
	}
}

func TestDeleteActivity_NeedsTheVersionSeenAndRefusesAStaleOne_Contract_SMM10(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)

	missing := priya.Do(t, http.MethodDelete, "/api/v1/activities/A-1002", nil, apitest.SkipRequestValidation())
	stale := priya.Do(t, http.MethodDelete, "/api/v1/activities/A-1002?version=99", nil)
	still := priya.Do(t, http.MethodGet, "/api/v1/activities/A-1002", nil)

	var conflict struct{ Error struct{ Code string } }
	stale.Decode(t, &conflict)
	if missing.Status != http.StatusBadRequest || stale.Status != http.StatusConflict ||
		conflict.Error.Code != "version_conflict" || still.Status != http.StatusOK {
		t.Errorf("without version %d, stale %d %s, then the activity %d", missing.Status, stale.Status, stale.Body, still.Status)
	}
}
