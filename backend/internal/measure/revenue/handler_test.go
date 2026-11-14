package revenue_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
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
		"/api/v1/reports/funnel/ranked?year=2026&show=activity&group=owner&sort=actual&order=asc&size=200&q=a",
		"/api/v1/reports/revenue/ranked?year=2026&sort=goal&order=desc",
		"/api/v1/reports/revenue/ranked?year=2026&sort=performance&order=asc",
		"/api/v1/reports/revenue/ranked?year=2026&group=attr:ATTR-3&sort=roi&order=desc",
		"/api/v1/reports/funnel/ranked?year=2026&sort=goal&order=asc",
		"/api/v1/reports/funnel/ranked?year=2026&sort=performance&order=desc",
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
}

func TestRevenueAndFunnelReports_InTheCatalogue_049(t *testing.T) {
	t.Parallel()
	planner := apitest.New(t).SignIn(t, "priya.raman@shell.com")
	var catalogue measure.ReportCatalogue
	planner.Do(t, http.MethodGet, "/api/v1/reports", nil).Decode(t, &catalogue)
	if !slices.ContainsFunc(catalogue.Items, func(e measure.ReportEntry) bool { return e.Key == measure.KeyPerformance && e.Available }) {
		t.Errorf("catalogue %+v: Performance, made of Revenue and Funnel stages, is built", catalogue.Items)
	}
}

// The cards sum months while the ranked list rolls activities up, both from ActivitySeries; this proves they
// agree on the demo data once both are in the display currency.
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

func TestRankedEntries_SayTheWordTheirPerformanceImplies_048C1_FR023(t *testing.T) {
	t.Parallel()
	planner := apitest.New(t).SignIn(t, "priya.raman@shell.com")
	for _, show := range []string{"plan", "campaign", "activity"} {
		var revenueList revenue.RevenueRanked
		planner.Do(t, http.MethodGet, "/api/v1/reports/revenue/ranked?year=2026&size=50&show="+show, nil).Decode(t, &revenueList)
		checkVariance(t, "revenue "+show, revenueList.List, func(f revenue.RevenueFigures) (*float64, revenue.Variance) {
			return f.Performance, f.Variance
		})
		var funnelList revenue.FunnelRanked
		planner.Do(t, http.MethodGet, "/api/v1/reports/funnel/ranked?year=2026&size=50&show="+show, nil).Decode(t, &funnelList)
		checkVariance(t, "funnel "+show, funnelList, func(f revenue.FunnelFigures) (*float64, revenue.Variance) {
			return f.Performance, f.Variance
		})
	}
	var report revenue.RevenueReport
	planner.Do(t, http.MethodGet, "/api/v1/reports/revenue?year=2027", nil).Decode(t, &report)
	if report.Cards.Performance.Variance != revenue.NoGoal {
		t.Errorf("a year without goals: performance card says %q, want %q", report.Cards.Performance.Variance, revenue.NoGoal)
	}
}

func checkVariance[F any](t *testing.T, name string, list ranking.List[F], of func(F) (*float64, revenue.Variance)) {
	t.Helper()
	var walk func(entries []ranking.Entry[F])
	check := func(label string, f F) {
		performance, got := of(f)
		var whole *int
		if performance != nil {
			pct := int(*performance)
			whole = &pct
		}
		if want := revenue.VarianceOf(whole); got != want {
			t.Errorf("%s %s: performance %v says %q, want %q", name, label, performance, got, want)
		}
	}
	walk = func(entries []ranking.Entry[F]) {
		for _, e := range entries {
			check(e.Name, e.Figures)
			walk(e.Children)
		}
	}
	if len(list.Groups) == 0 {
		t.Fatalf("%s: no groups, want the demo data's entries to check", name)
	}
	for _, g := range list.Groups {
		check("total of "+g.Label, g.Totals)
		walk(g.Entries)
	}
}
