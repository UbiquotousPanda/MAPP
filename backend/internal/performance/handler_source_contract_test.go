package performance_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

type sourceAnswer struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Status        string `json:"status"`
	DeliveryRoute string `json:"deliveryRoute"`
	Version       int    `json:"version"`
}

func sourceEdit(name, route string, version int) map[string]any {
	return map[string]any{
		"name": name, "ownerId": "U-1001", "category": "marketingAutomation", "deliveryRoute": route,
		"cadence": "monthly", "description": "", "integrationId": "", "version": version,
	}
}

func TestPerformanceSources_ListGetAndEdit_Contract_FR001_FR005_FR045(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)
	path := "/api/v1/performance/sources/" + sourceID
	file := "Ref,Date,Activity,INQs\nr1,2026-02-01,A-1001,5\n"
	decoded[importAnswer](t, alex.Do(t, http.MethodPost, path+"/uploads", uploadBody(file)), http.StatusCreated)

	listed := alex.Do(t, http.MethodGet, "/api/v1/performance/sources", nil)
	read := decoded[sourceAnswer](t, alex.Do(t, http.MethodGet, path, nil), http.StatusOK)
	response := alex.Do(t, http.MethodPatch, path, sourceEdit("Eloqua EU", "upload", read.Version))
	again := alex.Do(t, http.MethodGet, path, nil)
	stale := alex.Do(t, http.MethodPatch, path, sourceEdit("Eloqua US", "upload", read.Version))

	if listed.Status != http.StatusOK || !strings.Contains(string(listed.Body), `"name":"Eloqua"`) {
		t.Errorf("list = %d %s, want the source", listed.Status, listed.Body)
	}
	saved := decoded[sourceAnswer](t, response, http.StatusOK)
	if saved.Name != "Eloqua EU" || saved.Version != read.Version+1 {
		t.Errorf("saved = %+v, want the new name at version %d", saved, read.Version+1)
	}
	if string(response.Body) != string(again.Body) || !strings.Contains(string(again.Body), `"factCount":1`) {
		t.Errorf("PATCH answered %s,\nGET answers %s; want the same source, its load figures (factCount 1) included",
			response.Body, again.Body)
	}
	if stale.Status != http.StatusConflict || !strings.Contains(string(stale.Body), "version_conflict") {
		t.Errorf("stale save = %d %s, want version_conflict", stale.Status, stale.Body)
	}
	if missing := alex.Do(t, http.MethodGet, "/api/v1/performance/sources/PS-9999", nil); missing.Status != http.StatusNotFound {
		t.Errorf("GET a missing source = %d %s, want 404", missing.Status, missing.Body)
	}
}

func TestReactivatePerformanceSource_Contract_FR004(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)
	path := "/api/v1/performance/sources/" + sourceID

	off := decoded[sourceAnswer](t, alex.Do(t, http.MethodPost, path+"/deactivate", nil), http.StatusOK)
	on := decoded[sourceAnswer](t, alex.Do(t, http.MethodPost, path+"/reactivate", nil), http.StatusOK)

	if off.Status != "inactive" || on.Status != "active" {
		t.Errorf("deactivate then reactivate = %s then %s, want inactive then active", off.Status, on.Status)
	}
	if missing := alex.Do(t, http.MethodPost, "/api/v1/performance/sources/PS-9999/reactivate", nil); missing.Status != http.StatusNotFound {
		t.Errorf("reactivate a missing source = %d %s, want 404", missing.Status, missing.Body)
	}
}

func TestColumnMappings_ListEditAndDelete_Contract_FR006_FR007(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)
	listed := decoded[struct {
		Items []struct {
			ID         string `json:"id"`
			ColumnName string `json:"columnName"`
			Version    int    `json:"version"`
		} `json:"items"`
	}](t, alex.Do(t, http.MethodGet, "/api/v1/performance/sources/"+sourceID+"/mappings", nil), http.StatusOK)
	if len(listed.Items) != 4 {
		t.Fatalf("mappings = %+v, want the four the source was given", listed.Items)
	}
	reference := listed.Items[0]
	for _, m := range listed.Items {
		if m.ColumnName == "Ref" {
			reference = m
		}
	}
	path := "/api/v1/performance/mappings/" + reference.ID

	edited := alex.Do(t, http.MethodPatch, path,
		map[string]any{"columnName": "Reference", "meaning": "reference", "version": reference.Version})
	deleted := alex.Do(t, http.MethodDelete, path, nil)
	again := alex.Do(t, http.MethodDelete, path, nil)

	if edited.Status != http.StatusOK || !strings.Contains(string(edited.Body), `"columnName":"Reference"`) {
		t.Errorf("PATCH mapping = %d %s, want the new column name", edited.Status, edited.Body)
	}
	if deleted.Status != http.StatusNoContent || again.Status != http.StatusNotFound {
		t.Errorf("DELETE mapping = %d, then %d; want 204 then 404", deleted.Status, again.Status)
	}
}

func TestPullAndGetImport_Contract_FR010_FR022(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)
	path := "/api/v1/performance/sources/" + sourceID
	refused := alex.Do(t, http.MethodPost, path+"/pull", nil)
	read := decoded[sourceAnswer](t, alex.Do(t, http.MethodGet, path, nil), http.StatusOK)
	decoded[sourceAnswer](t, alex.Do(t, http.MethodPatch, path, sourceEdit("Eloqua", "simulated", read.Version)), http.StatusOK)

	pulled := decoded[struct {
		ID     string `json:"id"`
		Origin string `json:"origin"`
		Status string `json:"status"`
	}](t, alex.Do(t, http.MethodPost, path+"/pull", nil), http.StatusCreated)
	got := alex.Do(t, http.MethodGet, "/api/v1/performance/imports/"+pulled.ID, nil)

	if refused.Status != http.StatusConflict || !strings.Contains(string(refused.Body), "not_allowed") {
		t.Errorf("pull from an upload source = %d %s, want 409 not_allowed", refused.Status, refused.Body)
	}
	if pulled.Origin != "simulated" || pulled.Status != "completed" {
		t.Errorf("pull = %+v, want a completed simulated load", pulled)
	}
	if got.Status != http.StatusOK || !strings.Contains(string(got.Body), `"id":"`+pulled.ID+`"`) {
		t.Errorf("GET the import = %d %s, want it", got.Status, got.Body)
	}
	if missing := alex.Do(t, http.MethodGet, "/api/v1/performance/imports/PIM-9999", nil); missing.Status != http.StatusNotFound {
		t.Errorf("GET a missing import = %d %s, want 404", missing.Status, missing.Body)
	}
}
