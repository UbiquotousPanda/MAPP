package settings_test

import (
	"net/http"
	"testing"
	"time"

	"mapp/internal/platform/apitest"
)

func TestModelsAPI_ListCreateGet_FR009(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	created := alex.Do(t, http.MethodPost, "/api/v1/models", lubricants2)
	invalid := alex.Do(t, http.MethodPost, "/api/v1/models", map[string]any{
		"name": " ", "inqToMqlRate": "0", "mqlToDealRate": "5", "averageDealSize": nil, "activityTypeIds": []string{},
	})
	got := alex.Do(t, http.MethodGet, "/api/v1/models/MOD-1003", nil)
	gone := alex.Do(t, http.MethodGet, "/api/v1/models/MOD-9999", nil)
	if list := alex.Do(t, http.MethodGet, "/api/v1/models", nil); list.Status != http.StatusOK {
		t.Errorf("list = %d %s", list.Status, list.Body)
	}

	assertAnswer(t, created, http.StatusCreated, lubricants2Body(1, alexAtStart))
	assertAnswer(t, got, http.StatusOK, lubricants2Body(1, alexAtStart))
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(
		`{"field":"name","message":"Enter a name."},`+
			`{"field":"inqToMqlRate","message":"Enter a rate above 0 % and at most 100 %, with at most two decimals."},`+
			`{"field":"averageDealSize","message":"Enter an average deal size above 0 USD, with at most two decimals."},`+
			`{"field":"activityTypeIds","message":"Tick at least one activity type."}`))
	assertAnswer(t, gone, http.StatusNotFound, modelGoneBody)
}

var lubricants2 = map[string]any{
	"name": "Lubricants 2.0", "inqToMqlRate": "2", "mqlToDealRate": "5",
	"averageDealSize": map[string]string{"amount": "10000", "currency": "USD"}, "activityTypeIds": []string{"AT-1002", "AT-1003"},
}

func lubricants2Body(version int, meta string) string {
	return `{"id":"MOD-1003","name":"Lubricants 2.0","inqToMqlRate":"2.00","mqlToDealRate":"5.00",` +
		`"averageDealSize":{"amount":"10000.00","currency":"USD"},"activityTypes":[` +
		`{"id":"AT-1003","name":"Digital media","active":true},{"id":"AT-1002","name":"Event","active":true}],` +
		`"inqToMqlVelocityMonths":0,"mqlToDealVelocityMonths":0,"allowedGoalStages":["inq","mql","revenue"],` +
		`"active":true,"usage":` + unusedBody + `,"version":` + itoa(version) + `,` + meta + `}`
}

func TestModelsAPI_UpdateConflict_FR007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	daniel := server.SignIn(t, danielsEmail)
	server.GrantRole(t, danielsEmail, "administrator", "all")
	mustCreate(t, alex, "/api/v1/models", lubricants2)
	server.Advance(90 * time.Minute)
	daniels := daniel.Do(t, http.MethodPatch, "/api/v1/models/MOD-1003", map[string]any{"mqlToDealRate": "6", "version": 1})

	alexs := alex.Do(t, http.MethodPatch, "/api/v1/models/MOD-1003", map[string]any{"name": "Alex's model", "version": 1})

	if daniels.Status != http.StatusOK {
		t.Fatalf("Daniel's update = %d %s", daniels.Status, daniels.Body)
	}
	assertAnswer(t, alexs, http.StatusConflict, `{"error":{"code":"version_conflict","message":"Not saved — Daniel Okoro changed this model",`+
		`"fields":[],"conflict":{"changedBy":"Daniel Okoro","changedAt":"2026-03-12T10:30:00Z"}}}`)
}

func TestModelsAPI_Impact_FR011(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/models", lubricants2)

	unused := alex.Do(t, http.MethodPost, "/api/v1/models/MOD-1003/impact", map[string]any{"inqToMqlRate": "3", "version": 1})
	invalid := alex.Do(t, http.MethodPost, "/api/v1/models/MOD-1003/impact", map[string]any{"activityTypeIds": []string{}, "version": 1})

	assertAnswer(t, unused, http.StatusOK, `{"warnings":[]}`)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"activityTypeIds","message":"Tick at least one activity type."}`))
}

func TestModelsAPI_Status_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/models", lubricants2)

	inactive := alex.Do(t, http.MethodPost, "/api/v1/models/MOD-1003/status", map[string]any{"active": false, "version": 1})
	stale := alex.Do(t, http.MethodPost, "/api/v1/models/MOD-1003/status", map[string]any{"active": true, "version": 1})

	assertAnswer(t, inactive, http.StatusOK, replace(lubricants2Body(2, alexAtStart), `"active":true,"usage"`, `"active":false,"usage"`))
	if stale.Status != http.StatusConflict {
		t.Errorf("stale %d %s", stale.Status, stale.Body)
	}
}

func TestModelsAPI_Delete_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithoutDemoHistory()) // BIN-1001 is the first entry of an empty recycle bin
	alex := server.SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/models", lubricants2)

	deleted := alex.Do(t, http.MethodDelete, "/api/v1/models/MOD-1003", nil)
	gone := alex.Do(t, http.MethodDelete, "/api/v1/models/MOD-9999", nil)

	assertAnswer(t, deleted, http.StatusOK, `{"recycleBinEntry":{"id":"BIN-1001","recordType":"model","recordTypeLabel":"model",`+
		`"recordId":"MOD-1003","recordName":"Lubricants 2.0","path":[],"parent":null,"deletedAt":"2026-03-12T09:00:00Z",`+
		`"deletedBy":{"id":"U-1001","name":"Alex Morgan"},"contents":[]}}`)
	assertAnswer(t, gone, http.StatusNotFound, modelGoneBody)
}
