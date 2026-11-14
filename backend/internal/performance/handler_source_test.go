package performance_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

func TestDeleteSource_Contract_FR002(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	path := "/api/v1/performance/sources/" + preparedSource(t, alex)

	deleted := alex.Do(t, http.MethodDelete, path, nil)
	again := alex.Do(t, http.MethodDelete, path, nil)

	if deleted.Status != http.StatusNoContent || again.Status != http.StatusNotFound {
		t.Errorf("DELETE source = %d, then %d %s; want 204 then 404", deleted.Status, again.Status, again.Body)
	}
}

func TestTemplate_Contract_FR008(t *testing.T) {
	t.Parallel()
	alex := apitest.New(t).SignIn(t, alexsEmail)
	sourceID := preparedSource(t, alex)

	template := alex.Do(t, http.MethodGet, "/api/v1/performance/sources/"+sourceID+"/template", nil)
	if template.Status != http.StatusOK || strings.TrimSpace(string(template.Body)) != "Ref,Date,Activity,INQs" {
		t.Fatalf("template = %d %q, want exactly the mapped columns", template.Status, template.Body)
	}
}
