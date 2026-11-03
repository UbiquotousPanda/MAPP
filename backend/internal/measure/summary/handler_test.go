package summary_test

import (
	"net/http"
	"testing"

	"mapp/internal/measure/revenue"
	"mapp/internal/measure/summary"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/money"
)

const (
	alexEmail = "alex.morgan@shell.com"
	reportURL = "/api/v1/reports/summary"
	leagueURL = "/api/v1/reports/summary/league/"
)

func get(t *testing.T, c *apitest.Client, path string, status int) *apitest.Response {
	t.Helper()
	var opts []apitest.RequestOption
	if status == http.StatusBadRequest {
		opts = append(opts, apitest.SkipRequestValidation())
	}
	r := c.Do(t, http.MethodGet, path, nil, opts...)
	if r.Status != status {
		t.Fatalf("GET %s = %d %s, want %d", path, r.Status, r.Body, status)
	}
	return r
}

func TestSummaryReport_Contract_048(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexEmail)

	var view summary.Report
	get(t, alex, reportURL+"?year=2026", http.StatusOK).Decode(t, &view)

	if view.Revenue.PeriodLabel != "FY 2026" || len(view.Revenue.GoalCoverage) != 3 || len(view.Categories) == 0 {
		t.Errorf("report = %+v, want FY 2026 with three coverage stages and the categories", view.Revenue)
	}
	for _, query := range []string{"period=quarter&currency=EUR", "category=uncategorised&stage=mql", "category=NOPE"} {
		get(t, alex, reportURL+"?year=2026&"+query, http.StatusOK)
	}
	for _, table := range []string{"revenue", "performance", "cost", "roi"} {
		get(t, alex, leagueURL+table+"?year=2026", http.StatusOK)
		get(t, alex, leagueURL+table+"?year=2026&segment=NOPE", http.StatusOK)
	}
	for _, malformed := range []string{reportURL + "?stage=inq", reportURL + "?category=a%20b", leagueURL + "deals",
		leagueURL + "revenue?segment=a%2Fb"} {
		get(t, alex, malformed, http.StatusBadRequest)
	}
	if signedOut := server.Do(t, http.MethodGet, reportURL, nil); signedOut.Status != http.StatusUnauthorized {
		t.Errorf("signed out = %d, want 401", signedOut.Status)
	}
}

func TestSummaryReport_NoReportsView_048(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	admin := server.SignIn(t, alexEmail)
	var created struct{ ID string }
	admin.Do(t, http.MethodPost, "/api/v1/roles", map[string]any{"name": "Plans only", "defaultScope": "myTeams",
		"permissions": []string{"plans.view"}}).Decode(t, &created)
	admin.Do(t, http.MethodPut, "/api/v1/people/U-1004/roles", map[string]any{"version": 1,
		"roles": []map[string]any{{"roleId": created.ID, "scope": map[string]any{"type": "myTeams"}}}})
	mei := server.SignIn(t, "mei.lin@shell.com")

	get(t, mei, reportURL, http.StatusForbidden)
	get(t, mei, leagueURL+"revenue", http.StatusForbidden)
}

func TestSummary_EqualsRevenue_048_SC002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	alex := server.SignIn(t, alexEmail)
	for _, query := range []string{"?year=2026", "?year=2026&period=quarter", "?year=2026&category=uncategorised"} {
		var view summary.Report
		var rev revenue.RevenueReport
		get(t, alex, reportURL+query, http.StatusOK).Decode(t, &view)
		get(t, alex, "/api/v1/reports/revenue"+query, http.StatusOK).Decode(t, &rev)

		if !sameMoney(view.Revenue.ActualOrProjected, rev.Cards.Projected) || !sameMoney(view.Revenue.Goal, rev.Cards.Goal) {
			t.Errorf("%s: summary %v of %v, revenue %v of %v", query, view.Revenue.ActualOrProjected, view.Revenue.Goal,
				rev.Cards.Projected.Value, rev.Cards.Goal.Value)
		}
	}
}

func sameMoney(shown *money.Money, card revenue.MoneyCard) bool {
	if shown == nil || card.Value == nil {
		return shown == nil && card.Value == nil
	}
	return shown.Amount.Cmp(card.Value.Amount) == 0 && shown.Currency == card.Value.Currency
}
