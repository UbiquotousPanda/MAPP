package settings_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"mapp/internal/platform/apitest"
)

func TestActivityTypesAPI_ListCreateGet_FR013(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)

	list := alex.Do(t, http.MethodGet, "/api/v1/activity-types", nil)
	created := alex.Do(t, http.MethodPost, "/api/v1/activity-types", webinarBody("MOD-1001"))
	got := alex.Do(t, http.MethodGet, "/api/v1/activity-types/AT-1007", nil)
	gone := alex.Do(t, http.MethodGet, "/api/v1/activity-types/AT-9999", nil)
	invalid := alex.Do(t, http.MethodPost, "/api/v1/activity-types", map[string]any{
		"name": " event ", "defaultPlannedCost": map[string]string{"amount": "-5", "currency": "USD"}, "modelIds": []string{"MOD-9999"},
	})

	if list.Status != http.StatusOK {
		t.Errorf("list = %d %s", list.Status, list.Body)
	}
	assertAnswer(t, created, http.StatusCreated, webinarAnswer(1, lubricantsRef, allowedInOneModel))
	assertAnswer(t, got, http.StatusOK, webinarAnswer(1, lubricantsRef, allowedInOneModel))
	assertAnswer(t, gone, http.StatusNotFound, activityTypeGoneBody)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(
		`{"field":"name","message":"An activity type called 'Event' already exists."},`+
			`{"field":"defaultPlannedCost","message":"Enter an amount of 0 or more, with at most two decimals."},`+
			`{"field":"modelIds","message":"A model you ticked no longer exists — reload the page and try again."}`))
}

const (
	activityTypeGoneBody = `{"error":{"code":"not_found","message":"This activity type no longer exists — someone may have deleted it.","fields":[]}}`
	lubricantsRef        = `{"id":"MOD-1001","name":"Lubricants 1.0","active":true}`
	allowedInOneModel    = `{"inUse":true,"summary":"Allowed in 1 model","parts":[{"kind":"model","text":"Allowed in 1 model","count":1,"inRecycleBin":0}],"records":[]}`
)

func webinarBody(modelIDs ...string) map[string]any {
	if modelIDs == nil {
		modelIDs = []string{}
	}
	return map[string]any{"name": "Webinar", "defaultPlannedCost": map[string]string{"amount": "5000", "currency": "USD"}, "modelIds": modelIDs}
}

// webinarAnswer takes the models allowing the type as comma-separated JSON objects.
func webinarAnswer(version int, models, usage string) string {
	return `{"id":"AT-1007","name":"Webinar","defaultPlannedCost":{"amount":"5000.00","currency":"USD"},"models":[` + models +
		`],"category":null,"active":true,"usage":` + usage + `,"version":` + itoa(version) + `,` + alexAtStart + `}`
}

func TestActivityTypesAPI_UpdateConflict_FR007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	daniel := server.SignIn(t, danielsEmail)
	server.GrantRole(t, danielsEmail, "administrator", "all")
	mustCreate(t, alex, "/api/v1/activity-types", webinarBody())
	server.Advance(90 * time.Minute)
	daniels := daniel.Do(t, http.MethodPatch, "/api/v1/activity-types/AT-1007", map[string]any{"defaultPlannedCost": nil, "version": 1})

	alexs := alex.Do(t, http.MethodPatch, "/api/v1/activity-types/AT-1007", map[string]any{"name": "Webinars", "version": 1})

	assertAnswer(t, daniels, http.StatusOK, `{"id":"AT-1007","name":"Webinar","defaultPlannedCost":null,"models":[],"category":null,"active":true,"usage":`+
		unusedBody+`,"version":2,"createdAt":"2026-03-12T09:00:00Z","createdBy":{"id":"U-1001","name":"Alex Morgan"},`+
		`"updatedAt":"2026-03-12T10:30:00Z","updatedBy":{"id":"U-1003","name":"Daniel Okoro"}}`)
	assertAnswer(t, alexs, http.StatusConflict, `{"error":{"code":"version_conflict","message":"Not saved — Daniel Okoro changed this activity type",`+
		`"fields":[],"conflict":{"changedBy":"Daniel Okoro","changedAt":"2026-03-12T10:30:00Z"}}}`)
}

func TestActivityTypesAPI_Impact_FR012(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/activity-types", webinarBody("MOD-1001"))

	unused := alex.Do(t, http.MethodPost, "/api/v1/activity-types/AT-1007/impact", map[string]any{"modelIds": []string{}, "version": 1})
	invalid := alex.Do(t, http.MethodPost, "/api/v1/activity-types/AT-1007/impact", map[string]any{"modelIds": []string{"MOD-9999"}, "version": 1})

	assertAnswer(t, unused, http.StatusOK, `{"warnings":[]}`)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"modelIds","message":"A model you ticked no longer exists — reload the page and try again."}`))
}

func TestActivityTypesAPI_Status_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/activity-types", webinarBody())

	inactive := alex.Do(t, http.MethodPost, "/api/v1/activity-types/AT-1007/status", map[string]any{"active": false, "version": 1})
	stale := alex.Do(t, http.MethodPost, "/api/v1/activity-types/AT-1007/status", map[string]any{"active": true, "version": 1})

	assertAnswer(t, inactive, http.StatusOK, replace(webinarAnswer(2, "", unusedBody), `"active":true`, `"active":false`))
	if stale.Status != http.StatusConflict {
		t.Errorf("stale %d %s", stale.Status, stale.Body)
	}
}

func TestActivityTypesAPI_Delete_FR004(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t, apitest.WithoutDemoHistory()).SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/activity-types", webinarBody())

	deleted := alex.Do(t, http.MethodDelete, "/api/v1/activity-types/AT-1007", nil)
	inUse := alex.Do(t, http.MethodDelete, "/api/v1/activity-types/AT-1002", nil)

	assertAnswer(t, deleted, http.StatusOK, `{"recycleBinEntry":{"id":"BIN-1001","recordType":"activityType","recordTypeLabel":"activity type",`+
		`"recordId":"AT-1007","recordName":"Webinar","path":[],"parent":null,"deletedAt":"2026-03-12T09:00:00Z",`+
		`"deletedBy":{"id":"U-1001","name":"Alex Morgan"},"contents":[]}}`)
	if inUse.Status != http.StatusConflict || !strings.Contains(string(inUse.Body), `"code":"in_use"`) {
		t.Errorf("deleting Event = %d %s, want 409 in_use", inUse.Status, inUse.Body)
	}
}
