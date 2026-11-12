package settings_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	categoryGoneBody = `{"error":{"code":"not_found","message":"This activity category no longer exists — someone may have deleted it.","fields":[]}}`
	groupsOneType    = `{"inUse":false,"summary":"Groups 1 activity type","parts":` +
		`[{"kind":"activityType","text":"Groups 1 activity type","count":1,"inRecycleBin":0}],"records":[]}`
	eventRef = `{"id":"AT-1002","name":"Event","active":true}`
)

// digitalBody is a new activity category grouping the activity types.
func digitalBody(isDefault bool, typeIDs ...string) map[string]any {
	if typeIDs == nil {
		typeIDs = []string{}
	}
	return map[string]any{"name": "Digital", "isDefault": isDefault, "activityTypeIds": typeIDs}
}

// digitalAnswer is the answer for the category digitalBody (CAT-1001) at version 1, with its activity
// types (JSON objects, comma separated), its default flag and its usage, created by Alex.
func digitalAnswer(types, isDefault, usage string) string {
	return `{"id":"CAT-1001","name":"Digital","isDefault":` + isDefault + `,"activityTypes":[` + types +
		`],"active":true,"usage":` + usage + `,"version":1,` + alexAtStart + `}`
}

func TestActivityCategoriesAPI_ListCreateGet_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)

	empty := alex.Do(t, http.MethodGet, "/api/v1/settings/activity-categories", nil)
	created := mustCreate(t, alex, "/api/v1/settings/activity-categories", digitalBody(true, "AT-1002"))
	got := alex.Do(t, http.MethodGet, "/api/v1/settings/activity-categories/CAT-1001", nil)
	gone := alex.Do(t, http.MethodGet, "/api/v1/settings/activity-categories/CAT-9999", nil)
	invalid := alex.Do(t, http.MethodPost, "/api/v1/settings/activity-categories", map[string]any{
		"name": " digital ", "isDefault": false, "activityTypeIds": []string{"AT-9999"},
	})

	assertAnswer(t, empty, http.StatusOK, `{"items":[],"total":0}`)
	assertAnswer(t, created, http.StatusCreated, digitalAnswer(eventRef, "true", groupsOneType))
	assertAnswer(t, got, http.StatusOK, digitalAnswer(eventRef, "true", groupsOneType))
	assertAnswer(t, gone, http.StatusNotFound, categoryGoneBody)
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(
		`{"field":"name","message":"An activity category called 'Digital' already exists."},`+
			`{"field":"activityTypeIds","message":"An activity type you ticked no longer exists — reload the page and try again."}`))
}

func TestActivityCategoriesAPI_Delete_FR021(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithoutDemoHistory())
	alex := server.SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/settings/activity-categories", digitalBody(false, "AT-1002"))

	deleted := alex.DeleteSeen(t, "/api/v1/settings/activity-categories/CAT-1001")

	assertAnswer(t, deleted, http.StatusOK, `{"recycleBinEntry":{"id":"BIN-1001","recordType":"activityCategory",`+
		`"recordTypeLabel":"activity category","recordId":"CAT-1001","recordName":"Digital","path":[],"parent":null,`+
		`"deletedAt":"2026-03-12T09:00:00Z","deletedBy":{"id":"U-1001","name":"Alex Morgan"},"contents":[]}}`)
}

func TestActivityCategoriesAPI_Update_FR018(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	mustCreate(t, alex, "/api/v1/settings/activity-categories", digitalBody(false))

	saved := alex.Do(t, http.MethodPatch, "/api/v1/settings/activity-categories/CAT-1001", map[string]any{"name": "Online", "version": 1})
	stale := alex.Do(t, http.MethodPatch, "/api/v1/settings/activity-categories/CAT-1001", map[string]any{"name": "Web", "version": 1})

	if saved.Status != http.StatusOK || !strings.Contains(string(saved.Body), `"name":"Online"`) {
		t.Errorf("saving = %d %s, want 200 with the new name", saved.Status, saved.Body)
	}
	if stale.Status != http.StatusConflict {
		t.Errorf("stale save = %d %s, want 409", stale.Status, stale.Body)
	}
}
