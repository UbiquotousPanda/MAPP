package plan_test

import (
	"net/http"
	"testing"

	"mapp/internal/plan"
	"mapp/internal/platform/apitest"
)

// FY2026 Mobility China lacks its business unit, and two records below it miss fields: Publish lists them all
// and the plan stays Draft; once they are filled in or gone, Publish succeeds.
func TestPublish_NotReadyThenPublished_FR024(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	server.GrantRole(t, priyasEmail, "globalPlanner", "all") // 014: every market's plans

	refused := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1002/publish", nil)
	var china plan.PlanView
	priya.Do(t, http.MethodGet, "/api/v1/plans/P-1002", nil).Decode(t, &china)
	form := formOf(china)
	form["attributes"] = map[string]any{"SA-1001": []string{"SO-1002"}}
	saved := priya.Do(t, http.MethodPatch, "/api/v1/plans/P-1002", form)
	stillRefused := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1002/publish", nil)
	deleted := priya.Do(t, http.MethodDelete, "/api/v1/campaigns/C-1003", nil)
	published := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1002/publish", nil)

	below := `{"record":{"type":"campaign","id":"C-1003","name":"Retail growth"},` +
		`"fields":[{"field":"attributes.SA-1003","label":"Cluster"},{"field":"attributes.SA-1004","label":"Region"}]},` +
		`{"record":{"type":"initiative","id":"I-1006","name":"Fleet cards"},"fields":[{"field":"startDate","label":"Dates"}]}`
	assertAnswer(t, refused, http.StatusConflict, `{"error":{"code":"not_ready","message":"Publish needs 4 fields","fields":[],`+
		`"missing":[{"record":{"type":"plan","id":"P-1002","name":"FY2026 Mobility China"},`+
		`"fields":[{"field":"attributes.SA-1001","label":"Business unit"}]},`+below+`]}}`)
	if china.Status != plan.StatusDraft || china.Version != 1 {
		t.Errorf("after the refusal: %s, version %d; want Draft, version 1", china.Status, china.Version)
	}
	assertFields(t, saved, http.StatusOK, map[string]any{"status": "draft", "version": 2})
	assertAnswer(t, stillRefused, http.StatusConflict, `{"error":{"code":"not_ready","message":"Publish needs 3 fields","fields":[],`+
		`"missing":[`+below+`]}}`)
	if deleted.Status != http.StatusOK {
		t.Fatalf("deleting Retail growth = %d %s, want 200", deleted.Status, deleted.Body)
	}
	assertFields(t, published, http.StatusOK, map[string]any{
		"status": "published", "version": 3, "updatedBy": map[string]any{"id": "U-1002", "name": "Priya Raman"},
	})
}

func TestUnpublish_FR025(t *testing.T) {
	t.Parallel()
	priya := apitest.New(t).SignIn(t, priyasEmail)

	empty := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1001/unpublish", map[string]any{"reason": "  "})
	unpublished := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1001/unpublish", map[string]any{"reason": "Budget under review"})

	assertAnswer(t, empty, http.StatusBadRequest, validationBody(`{"field":"reason","message":"Enter a reason."}`))
	assertFields(t, unpublished, http.StatusOK, map[string]any{"status": "draft", "version": 2})
}
