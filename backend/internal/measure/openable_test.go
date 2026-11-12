package measure_test

import (
	"net/http"
	"testing"

	"mapp/internal/platform/apitest"
)

func TestPlanData_PeopleExportNeedsAccessManage_059_FR007(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	planner, admin := server.SignIn(t, priyaEmail), server.SignIn(t, alexEmail)
	people := "/api/v1/reports/plan-data/export?tab=people&format=xlsx"

	if r := planner.Do(t, http.MethodGet, people, nil); r.Status != http.StatusForbidden {
		t.Errorf("a planner GET %s = %d %s, want 403: People needs access.manage", people, r.Status, r.Body)
	}
	call(t, planner, "/api/v1/reports/plan-data/export?tab=completeness&format=xlsx", http.StatusOK)
	call(t, admin, people, http.StatusOK)
}
