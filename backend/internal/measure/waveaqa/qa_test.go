// Package waveaqa is the wave A quality pass of the Measure module (issue #46): every built report on the demo data
// under the demo roles, through the API. It checks what a person's role and scope let them see, not a report's figures.
package waveaqa_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	alex   = "alex.morgan@shell.com"
	carlos = "carlos.mendes@shell.com"
	priya  = "priya.raman@shell.com"
	daniel = "daniel.okoro@shell.com"
	mei    = "mei.lin@shell.com"
	sara   = "sara.novak@shell.com"
	lea    = "lea.santos@shell.com"

	lubricants = "FY2026 Lubricants Europe"
	mobility   = "FY2026 Mobility China"
)

// builtReports are the wave A reports with the year the demo data has something to show for.
type built struct {
	path, key string
	year      int
}

func builtReports() []built {
	return []built{{"plan-budget", "planBudget", 2026}, {"approvals", "approvals", 2026},
		{"purchase-requests", "purchaseRequests", 2027}, {"plan-details", "planDetails", 2026}, {"gsap-link", "gsapLink", 2026}}
}

func getJSON(t *testing.T, c *apitest.Client, path string, into any) int {
	t.Helper()
	r := c.Do(t, http.MethodGet, path, nil, apitest.SkipValidation())
	if into != nil && r.Status == http.StatusOK {
		if err := json.Unmarshal(r.Body, into); err != nil {
			t.Fatalf("GET %s: %v", path, err)
		}
	}
	return r.Status
}

type frame struct {
	Choices struct {
		Plans []struct{ Name string } `json:"plans"`
	} `json:"choices"`
	Finance struct{ Plans, Of int } `json:"finance"`
}

func planNames(t *testing.T, c *apitest.Client, report string) ([]string, frame) {
	t.Helper()
	var f frame
	getJSON(t, c, "/api/v1/reports/frame?report="+report+"&year=2026", &f)
	names := []string{}
	for _, p := range f.Choices.Plans {
		names = append(names, p.Name)
	}
	return names, f
}

func TestWaveA_ScopePerRole_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)

	want := map[string][]string{alex: {lubricants, mobility}, carlos: {lubricants, mobility}, sara: {lubricants, mobility},
		lea: {lubricants, mobility}, priya: {lubricants}, daniel: {lubricants}, mei: {mobility}}
	for who, plans := range want {
		for _, report := range builtReports() {
			got, _ := planNames(t, server.SignIn(t, who), report.key)
			slices.Sort(got)
			slices.Sort(plans)
			if !slices.Equal(got, plans) {
				t.Errorf("%s on %s sees plans %v, want %v", who, report.path, got, plans)
			}
		}
	}
}

func TestWaveA_CatalogueMatchesAccess_FR001(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)

	for _, who := range []string{alex, carlos, priya, daniel, mei, sara, lea} {
		c := server.SignIn(t, who)
		for _, report := range builtReports() {
			if status := getJSON(t, c, fmt.Sprintf("/api/v1/reports/%s?year=%d", report.path, report.year), nil); status != http.StatusOK {
				t.Errorf("%s opening %s = %d, want 200: the catalogue offers it", who, report.path, status)
			}
		}
		wantAccess := http.StatusForbidden
		if who == alex {
			wantAccess = http.StatusOK
		}
		if status := getJSON(t, c, "/api/v1/reports/user-access", nil); status != wantAccess {
			t.Errorf("%s opening user-access = %d, want %d: only access.manage opens it", who, status, wantAccess)
		}
	}
}

func TestWaveA_NoFinancialAccess_FR004(t *testing.T) {
	t.Parallel()
	c := apitest.New(t).SignIn(t, lea)

	var approvals struct {
		FinanceCovers struct{ Plans, Of int } `json:"financeCovers"`
		Grid          struct {
			Items []struct {
				Amount *json.RawMessage `json:"amount"`
			} `json:"items"`
		} `json:"grid"`
	}
	var requests struct {
		FinanceCovers struct{ Plans, Of int } `json:"financeCovers"`
		Cards         struct {
			Committed *json.RawMessage `json:"committed"`
			Invoiced  *json.RawMessage `json:"invoiced"`
		} `json:"cards"`
	}
	getJSON(t, c, "/api/v1/reports/approvals?year=2026&pageSize=100", &approvals)
	getJSON(t, c, "/api/v1/reports/purchase-requests?year=2027", &requests)

	if approvals.FinanceCovers.Plans != 0 || approvals.FinanceCovers.Of == 0 {
		t.Errorf("approvals covers = %+v, want no plan with amounts and some with rounds", approvals.FinanceCovers)
	}
	for i, row := range approvals.Grid.Items {
		if row.Amount != nil && string(*row.Amount) != "null" {
			t.Errorf("approval row %d shows an amount %s without finance.view", i, *row.Amount)
		}
	}
	if requests.FinanceCovers.Plans != 0 || requests.FinanceCovers.Of == 0 {
		t.Errorf("purchase requests covers = %+v, want none covered of some", requests.FinanceCovers)
	}
	if requests.Cards.Committed != nil || requests.Cards.Invoiced != nil {
		t.Errorf("committed, invoiced = %v, %v, want null without finance.view, never 0.00", requests.Cards.Committed, requests.Cards.Invoiced)
	}
}

func TestWaveA_ExportRights_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	exports := []string{
		"/api/v1/reports/approvals/export?year=2026&format=csv&widget=approvals",
		"/api/v1/reports/purchase-requests/export?year=2027&format=csv&widget=grid",
		"/api/v1/reports/plan-budget/export?year=2026&format=xlsx",
	}

	for _, path := range exports {
		if status := getJSON(t, server.SignIn(t, alex), path, nil); status != http.StatusOK {
			t.Errorf("Alex exporting %s = %d, want 200", path, status)
		}
		if status := getJSON(t, server.SignIn(t, lea), path, nil); status != http.StatusForbidden {
			t.Errorf("Lea exporting %s = %d, want 403: no data.export", path, status)
		}
	}
}

func TestWaveA_GridExportsKeepFilters_FR023(t *testing.T) {
	t.Parallel()
	c := apitest.New(t).SignIn(t, alex)

	all := c.Do(t, http.MethodGet, "/api/v1/reports/approvals/export?year=2026&format=csv&widget=approvals", nil)
	waiting := c.Do(t, http.MethodGet, "/api/v1/reports/approvals/export?year=2026&format=csv&widget=approvals&outcome=waiting", nil)

	if waiting.Status != http.StatusOK || len(waiting.Body) >= len(all.Body) {
		t.Errorf("filtered export = %d, %d bytes against %d: want 200 and fewer rows than the unfiltered file", waiting.Status, len(waiting.Body), len(all.Body))
	}
}

func TestWaveA_PurchaseRequestExportKeepsFilters_FR027(t *testing.T) {
	t.Parallel()
	c := apitest.New(t).SignIn(t, alex)
	base := "/api/v1/reports/purchase-requests/export?year=2027&format=csv&widget=grid"

	all := c.Do(t, http.MethodGet, base, nil)
	vendor := c.Do(t, http.MethodGet, base+"&vendor=Nobody", nil)
	columns := c.Do(t, http.MethodGet, base+"&columns=id", nil)

	if vendor.Status != http.StatusOK || len(vendor.Body) >= len(all.Body) {
		t.Errorf("vendor-filtered export = %d, %d bytes against %d: want 200 and fewer rows", vendor.Status, len(vendor.Body), len(all.Body))
	}
	if columns.Status != http.StatusOK || len(columns.Body) >= len(all.Body) {
		t.Errorf("one-column export = %d, %d bytes against %d: want 200 and fewer columns", columns.Status, len(columns.Body), len(all.Body))
	}
}
