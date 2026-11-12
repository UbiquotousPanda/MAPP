package settings_test

import (
	"encoding/base64"
	"net/http"
	"reflect"
	"testing"

	"mapp/internal/platform/apitest"
)

// Options are searched by any part of the label; wrong paging is refused with a message.
func TestOptionsAPI_ListSearch_SC007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	costCentre := findAttribute(t, alex, "activity", "Cost centre")
	path := "/api/v1/shell-attributes/" + costCentre.ID + "/options"
	type page struct {
		Items []struct{ Label string }
		Total int
	}
	var found page

	alex.Do(t, http.MethodGet, path+"?q=%200220%20", nil).Decode(t, &found)
	invalid := alex.Do(t, http.MethodGet, path+"?limit=0&offset=-1&status=some", nil, apitest.SkipRequestValidation())

	if found.Total != 1 || len(found.Items) != 1 || found.Items[0].Label != "CN04000220" {
		t.Errorf("search 0220 = %+v", found)
	}
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"limit","message":"Choose a number from 1 to 500."},`+
		`{"field":"offset","message":"Choose 0 or more."},{"field":"status","message":"Choose active, inactive or all."}`))
}

// A new option answers 201, last in its attribute's list; a label already used is refused (FR-018).
func TestOptionsAPI_Create_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	created, _ := createMediaChannel(t, alex)
	path := "/api/v1/shell-attributes/" + created.ID + "/options"
	var added savedOption

	mustCreate(t, alex, path, map[string]any{"label": "Cinema"}).Decode(t, &added)
	taken := alex.Do(t, http.MethodPost, path, map[string]any{"label": "tv"})

	if added.Label != "Cinema" || added.Position != 5 || added.AttributeID != created.ID || !added.Active {
		t.Errorf("added = %+v", added)
	}
	assertAnswer(t, taken, http.StatusBadRequest, validationBody(`{"field":"label","message":"'TV' is already an option of Media channel."}`))
}

// A renamed option answers at its new version; an out-of-date version is a conflict (FR-018, FR-007).
func TestOptionsAPI_Update_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	_, options := createMediaChannel(t, alex)
	path := "/api/v1/shell-attribute-options/" + options[0].ID
	var renamed savedOption

	alex.Do(t, http.MethodPatch, path, map[string]any{"label": "Television", "version": 1}).Decode(t, &renamed)
	stale := alex.Do(t, http.MethodPatch, path, map[string]any{"label": "TV", "version": 1})

	if renamed.Label != "Television" || renamed.Version != 2 {
		t.Errorf("renamed = %+v", renamed)
	}
	if stale.Status != http.StatusConflict {
		t.Errorf("stale = %d %s", stale.Status, stale.Body)
	}
}

// Set inactive and Reactivate answer the option in its new status (FR-018).
func TestOptionsAPI_Status_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	_, options := createMediaChannel(t, alex)
	path := "/api/v1/shell-attribute-options/" + options[1].ID + "/status"
	var inactive, active savedOption

	alex.Do(t, http.MethodPost, path, map[string]any{"active": false, "version": 1}).Decode(t, &inactive)
	alex.Do(t, http.MethodPost, path, map[string]any{"active": true, "version": 2}).Decode(t, &active)
	invalid := alex.Do(t, http.MethodPost, path, map[string]any{"version": 3}, apitest.SkipRequestValidation())

	if inactive.Active || inactive.Version != 2 || !active.Active || active.Version != 3 {
		t.Errorf("inactive %+v, active %+v", inactive, active)
	}
	assertAnswer(t, invalid, http.StatusBadRequest, validationBody(`{"field":"active","message":"Reload the page and try again."}`))
}

// An option moves one place and answers in its new place; the first goes no further up (FR-018).
func TestOptionsAPI_Move_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	_, options := createMediaChannel(t, alex)
	var moved savedOption

	alex.Do(t, http.MethodPost, "/api/v1/shell-attribute-options/"+options[1].ID+"/move", map[string]any{"direction": "up", "version": 1}).Decode(t, &moved)
	first := alex.Do(t, http.MethodPost, "/api/v1/shell-attribute-options/"+options[1].ID+"/move", map[string]any{"direction": "up", "version": 2})

	if moved.Label != "Radio" || moved.Position != 1 || moved.Version != 2 {
		t.Errorf("moved = %+v", moved)
	}
	assertAnswer(t, first, http.StatusBadRequest, validationBody(`{"field":"direction","message":"'Radio' is already first."}`))
}

// GET answers one option with no locks while its attribute has others, the delete lock once it is the last.
func TestOptionsAPI_Get_D211(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	_, options := createMediaChannel(t, alex)
	type lock struct{ Field, Reason string }
	var first struct {
		ID, Label string
		Locks     []lock
	}

	alex.Do(t, http.MethodGet, "/api/v1/shell-attribute-options/"+options[0].ID, nil).Decode(t, &first)
	for _, o := range options[1:] {
		alex.Do(t, http.MethodDelete, "/api/v1/shell-attribute-options/"+o.ID, nil)
	}
	var last struct{ Locks []lock }
	alex.Do(t, http.MethodGet, "/api/v1/shell-attribute-options/"+options[0].ID, nil).Decode(t, &last)
	gone := alex.Do(t, http.MethodGet, "/api/v1/shell-attribute-options/SO-99999", nil)

	if first.ID != options[0].ID || first.Label != "TV" || first.Locks == nil || len(first.Locks) != 0 {
		t.Errorf("first = %+v; want TV without locks", first)
	}
	want := []lock{{Field: "delete", Reason: "'Media channel' needs at least one option, so 'TV' can't be deleted."}}
	if !reflect.DeepEqual(last.Locks, want) {
		t.Errorf("last option's locks = %+v, want %+v", last.Locks, want)
	}
	assertAnswer(t, gone, http.StatusNotFound,
		`{"error":{"code":"not_found","message":"This option no longer exists — someone may have deleted it.","fields":[]}}`)
}

// An unused option moves to the recycle bin; the last option of an attribute is refused.
func TestOptionsAPI_Delete_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	created, options := createMediaChannel(t, alex)
	var deleted struct {
		RecycleBinEntry struct {
			ID, RecordType string
			Parent         *struct{ ID string }
		}
	}

	alex.Do(t, http.MethodDelete, "/api/v1/shell-attribute-options/"+options[3].ID, nil).Decode(t, &deleted)
	for _, o := range options[1:] {
		alex.Do(t, http.MethodDelete, "/api/v1/shell-attribute-options/"+o.ID, nil)
	}
	last := alex.Do(t, http.MethodDelete, "/api/v1/shell-attribute-options/"+options[0].ID, nil)

	if deleted.RecycleBinEntry.RecordType != "shellAttributeOption" || deleted.RecycleBinEntry.Parent == nil ||
		deleted.RecycleBinEntry.Parent.ID != created.ID {
		t.Errorf("deleted = %+v", deleted)
	}
	assertAnswer(t, last, http.StatusConflict, `{"error":{"code":"in_use","message":"'Media channel' needs at least one option, so 'TV' can't be deleted.","fields":[]}}`)
}

// The import check answers every row's outcome; the import answers the counts; a gone attribute is refused.
func TestImportAPI_CheckAndImport_FR031(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexsEmail)
	var created savedAttribute
	mustCreate(t, alex, "/api/v1/shell-attributes", map[string]any{"label": "Cost centre", "level": "lineItem", "type": "singleChoice",
		"marking": "optional", "section": "Finance coding", "options": []map[string]any{{"label": "CN04000001"}}}).Decode(t, &created)
	file := func(text string) map[string]string {
		return map[string]string{"fileName": "cost-centres.csv", "content": base64.StdEncoding.EncodeToString([]byte(text))}
	}
	path := "/api/v1/shell-attributes/" + created.ID + "/options/"
	csv := "Option\nCN04000001\nCN04000002\n,see the note\n"

	checked := alex.Do(t, http.MethodPost, path+"import-check", file(csv))
	imported := alex.Do(t, http.MethodPost, path+"import", file(csv))
	gone := alex.Do(t, http.MethodPost, "/api/v1/shell-attributes/SA-9999/options/import", file(csv))

	assertAnswer(t, checked, http.StatusOK, `{"totalRows":3,"toAdd":[{"row":3,"label":"CN04000002","parentLabel":"","message":""}],`+
		`"alreadyPresent":[{"row":2,"label":"CN04000001","parentLabel":"","message":"Already an option — skipped."}],`+
		`"problems":[{"row":4,"label":"","parentLabel":"","message":"Empty — enter an option."}]}`)
	assertAnswer(t, imported, http.StatusOK, `{"added":1,"alreadyPresent":1,"problems":1}`)
	assertAnswer(t, gone, http.StatusNotFound, attributeGoneBody)
}
