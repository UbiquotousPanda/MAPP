package revenue_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/apitest"
)

func TestRevenueAndFunnelReports_Contract_049(t *testing.T) {
	t.Parallel()
	planner := apitest.New(t).SignIn(t, "priya.raman@shell.com")
	for _, path := range []string{
		"/api/v1/reports/revenue?year=2026",
		"/api/v1/reports/revenue?year=2026&period=quarter&currency=EUR",
		"/api/v1/reports/revenue/ranked?year=2026",
		"/api/v1/reports/revenue/ranked?year=2026&show=activity&group=owner&sort=actualRevenue&order=asc&size=25&q=a",
		"/api/v1/reports/funnel?year=2026",
		"/api/v1/reports/funnel?year=2026&stage=mql",
		"/api/v1/reports/funnel/ranked?year=2026",
		"/api/v1/reports/funnel/ranked?year=2026&show=activity&group=owner&sort=actual&order=asc&size=25&q=a",
	} {
		if r := planner.Do(t, http.MethodGet, path, nil); r.Status != http.StatusOK {
			t.Errorf("GET %s = %d %s, want 200", path, r.Status, r.Body)
		}
	}
	for _, path := range []string{
		"/api/v1/reports/revenue/ranked?sort=name&size=7",
		"/api/v1/reports/funnel/ranked?sort=name&size=7",
	} {
		bad := planner.Do(t, http.MethodGet, path, nil, apitest.SkipRequestValidation())
		if bad.Status != http.StatusBadRequest {
			t.Errorf("GET %s = %d %s, want 400", path, bad.Status, bad.Body)
		}
	}
	for _, path := range []string{"/api/v1/reports/revenue?year=2027", "/api/v1/reports/funnel?year=2027"} {
		if r := planner.Do(t, http.MethodGet, path, nil); r.Status != http.StatusOK {
			t.Errorf("GET %s, a year without goals = %d %s, want 200 with its reason in the contract", path, r.Status, r.Body)
		}
	}
	var catalogue measure.ReportCatalogue
	planner.Do(t, http.MethodGet, "/api/v1/reports", nil).Decode(t, &catalogue)
	for _, key := range []string{measure.KeyRevenue, measure.KeyFunnel} {
		if !slices.ContainsFunc(catalogue.Items, func(e measure.ReportEntry) bool { return e.Key == key && e.Available }) {
			t.Errorf("catalogue %+v: %s is built", catalogue.Items, key)
		}
	}
}

// The cards' "actual or projected" total and the ranked list's own group total come from different code
// paths (cards.go sums periods, ranked_revenue.go rolls up figures); this is the one place proving they
// still agree once both are converted to the display currency.
func TestRevenue_CardsTotalMatchesTheRankedListsOwnTotal_049(t *testing.T) {
	t.Parallel()
	planner := apitest.New(t).SignIn(t, "priya.raman@shell.com")
	var report revenue.RevenueReport
	planner.Do(t, http.MethodGet, "/api/v1/reports/revenue?year=2026", nil).Decode(t, &report)
	var ranked revenue.RevenueRanked
	planner.Do(t, http.MethodGet, "/api/v1/reports/revenue/ranked?year=2026&show=plan", nil).Decode(t, &ranked)

	if report.Cards.Projected.Value == nil || len(ranked.Groups) == 0 {
		t.Fatalf("cards %+v, ranked groups %+v: want both to carry the demo data", report.Cards, ranked.Groups)
	}
	var total int64
	for _, g := range ranked.Groups {
		if g.Totals.Projected != nil {
			total += g.Totals.Projected.Amount.Cents()
		}
	}
	if total != report.Cards.Projected.Value.Amount.Cents() {
		t.Errorf("ranked plans total = %d cents, want the cards' own total %d cents",
			total, report.Cards.Projected.Value.Amount.Cents())
	}
}
