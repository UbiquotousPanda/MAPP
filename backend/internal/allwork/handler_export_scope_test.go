package allwork_test

import (
	"net/http"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

type canExport struct {
	CanExport bool `json:"canExport"`
}

// Priya sees every plan through the Requisitioner role but exports only in her team, Lubricants Europe.
func TestExport_OnlyThePlansDataExportCovers(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, "alex.morgan@shell.com")
	if r := alex.Do(t, http.MethodPut, "/api/v1/people/U-1002/roles", map[string]any{"version": 1, "roles": []map[string]any{
		{"roleId": "RL-1003", "scope": map[string]any{"type": "myTeams"}},
		{"roleId": "RL-1006", "scope": map[string]any{"type": "all"}},
	}}); r.Status != http.StatusOK {
		t.Fatalf("roles = %d %s", r.Status, r.Body)
	}
	priya := server.SignIn(t, priyasEmail)

	var page canExport
	priya.Do(t, http.MethodGet, "/api/v1/all-work", nil).Decode(t, &page)
	csv := string(priya.Do(t, http.MethodGet, "/api/v1/all-work/export?format=csv", nil).Body)
	sees := string(priya.Do(t, http.MethodGet, "/api/v1/all-work", nil).Body)

	if !page.CanExport || !strings.Contains(csv, "FY2026 Lubricants Europe") || strings.Contains(csv, "FY2026 Mobility China") ||
		!strings.Contains(sees, "FY2026 Mobility China") {
		t.Errorf("canExport %v; the export holds Europe only and the page shows China too:\n%s", page.CanExport, csv)
	}
}

func TestExport_NoButtonAndRefusedWithoutDataExport(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	lea := server.SignIn(t, "lea.santos@shell.com")

	var page canExport
	lea.Do(t, http.MethodGet, "/api/v1/all-work", nil).Decode(t, &page)
	refused := lea.Do(t, http.MethodGet, "/api/v1/all-work/export?format=csv", nil)

	if page.CanExport || refused.Status != http.StatusForbidden {
		t.Errorf("canExport %v, export %d; want no export", page.CanExport, refused.Status)
	}
}
