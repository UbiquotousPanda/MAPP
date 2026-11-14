package performance_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

type rowAnswer struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func TestReviewRow_GetAndReopen_Contract_FR024(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)
	file := "Ref,Date,Activity,INQs\nr1,2026-02-01,A-9999,oops\n"
	decoded[importAnswer](t, alex.Do(t, http.MethodPost, "/api/v1/performance/sources/"+sourceID+"/uploads", uploadBody(file)),
		http.StatusCreated)
	listed := alex.Do(t, http.MethodGet, "/api/v1/performance/review-rows?status=open&sourceId="+sourceID, nil)
	path := "/api/v1/performance/review-rows/" + idOf(t, string(listed.Body), "PRV-")

	read := decoded[rowAnswer](t, alex.Do(t, http.MethodGet, path, nil), http.StatusOK)
	decoded[rowAnswer](t, alex.Do(t, http.MethodPost, path+"/dismiss", map[string]string{"comment": "Test row"}), http.StatusOK)
	reopened := decoded[rowAnswer](t, alex.Do(t, http.MethodPost, path+"/reopen", nil), http.StatusOK)

	if read.Status != "open" || reopened.Status != "open" {
		t.Errorf("row = %s, after dismiss and reopen %s; want open both times", read.Status, reopened.Status)
	}
	if missing := alex.Do(t, http.MethodGet, "/api/v1/performance/review-rows/PRV-9999", nil); missing.Status != http.StatusNotFound {
		t.Errorf("GET a missing row = %d %s, want 404", missing.Status, missing.Body)
	}
}

func TestActivityPerformancePanel_Contract_FR027_FR029(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)

	approved := alex.Do(t, http.MethodGet, "/api/v1/activities/A-1002/performance", nil)
	submitted := alex.Do(t, http.MethodGet, "/api/v1/activities/A-1004/performance", nil)
	missing := alex.Do(t, http.MethodGet, "/api/v1/activities/A-9999/performance", nil)

	if approved.Status != http.StatusOK || !strings.Contains(string(approved.Body), `"state":"ok"`) {
		t.Errorf("panel of an approved activity = %d %s, want state ok", approved.Status, approved.Body)
	}
	if submitted.Status != http.StatusOK || !strings.Contains(string(submitted.Body), `"state":"notApproved"`) {
		t.Errorf("panel of a submitted activity = %d %s, want state notApproved", submitted.Status, submitted.Body)
	}
	if missing.Status != http.StatusNotFound {
		t.Errorf("panel of a missing activity = %d %s, want 404", missing.Status, missing.Body)
	}
}

// codesForA1001 makes A-1001's activity type use media codes, with no required attribute.
func codesForA1001(t *testing.T, alex *apitest.Client) {
	t.Helper()
	config := decoded[struct {
		MediaCodeNext int64 `json:"mediaCodeNext"`
		Version       int   `json:"version"`
	}](t, alex.Do(t, http.MethodGet, "/api/v1/performance/configuration", nil), http.StatusOK)
	act := decoded[struct {
		ActivityType struct {
			ID string `json:"id"`
		} `json:"activityType"`
	}](t, alex.Do(t, http.MethodGet, "/api/v1/activities/A-1001", nil), http.StatusOK)
	decoded[map[string]any](t, alex.Do(t, http.MethodPatch, "/api/v1/performance/configuration", map[string]any{
		"activityTypeIds": []string{act.ActivityType.ID}, "codeAttributes": []map[string]any{},
		"mediaCodeNext": config.MediaCodeNext, "version": config.Version,
	}), http.StatusOK)
}

func TestMediaCode_EditAndDeactivate_Contract_FR041(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	codesForA1001(t, alex)
	created := decoded[struct {
		ID      string `json:"id"`
		Version int    `json:"version"`
	}](t, alex.Do(t, http.MethodPost, "/api/v1/activities/A-1001/media-codes", map[string]any{}), http.StatusCreated)
	path := "/api/v1/media-codes/" + created.ID

	edited := alex.Do(t, http.MethodPatch, path, map[string]any{
		"attributes": map[string]string{}, "landingPage": "https://example.com/helix", "version": created.Version,
	})
	off := alex.Do(t, http.MethodPost, path+"/deactivate", nil)
	missing := alex.Do(t, http.MethodPost, "/api/v1/media-codes/MC-9999/deactivate", nil)

	if edited.Status != http.StatusOK || !strings.Contains(string(edited.Body), `"landingPage":"https://example.com/helix"`) {
		t.Errorf("PATCH code = %d %s, want the new landing page", edited.Status, edited.Body)
	}
	if off.Status != http.StatusOK || !strings.Contains(string(off.Body), `"status":"inactive"`) {
		t.Errorf("deactivate = %d %s, want the code inactive", off.Status, off.Body)
	}
	if missing.Status != http.StatusNotFound {
		t.Errorf("deactivate a missing code = %d %s, want 404", missing.Status, missing.Body)
	}
}
