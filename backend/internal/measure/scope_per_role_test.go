package measure_test

import (
	"net/http"
	"slices"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	meiEmail  = "mei.lin@shell.com"
	saraEmail = "sara.novak@shell.com"
)

// scopeOf is every plan each demo person's reports.view reaches on the Measure demo, whatever its year.
func scopeOf() map[string][]string {
	lubricants := []string{"FY2026 Lubricants Europe", "FY2027 Lubricants UK & Ireland"}
	mobility := []string{"FY2026 Mobility China"}
	all := slices.Concat(lubricants, mobility,
		[]string{"FY2026 Measure demo – Lubricants Benelux", "FY2027 Global Brand"})
	return map[string][]string{alexEmail: all, carlosEmail: all, "lea.santos@shell.com": all,
		priyaEmail: lubricants, "daniel.okoro@shell.com": lubricants, meiEmail: mobility,
		saraEmail: slices.Concat(lubricants, mobility)}
}

func scopeIn(scope []string, year string) []string {
	plans := []string{}
	for _, plan := range scope {
		if strings.HasPrefix(plan, "FY"+year+" ") {
			plans = append(plans, plan)
		}
	}
	slices.Sort(plans)
	return plans
}

// scopedReport lists the answers that name a report's plans or their records; a report of totals only
// instead counts the plans it covers.
type scopedReport struct {
	key, year string
	paths     []string
	covered   func(t *testing.T, c *apitest.Client) int
}

func scopedReports() []scopedReport {
	return []scopedReport{
		{key: "planBudget", year: "2026", paths: []string{"/reports/plan-budget?year=2026",
			"/reports/plan-budget/ranked?year=2026&show=plan"}},
		{key: "approvals", year: "2026", paths: []string{"/reports/approvals?year=2026&pageSize=100"}},
		{key: "purchaseRequests", year: "2027", paths: []string{"/reports/purchase-requests?year=2027&pageSize=100"}},
		{key: "gsapLink", year: "2026", paths: []string{"/reports/gsap-link?year=2026"}},
		{key: "revenue", year: "2026", paths: []string{"/reports/revenue/ranked?year=2026&show=plan",
			"/reports/revenue/ranked?year=2026&show=activity"}},
		{key: "funnel", year: "2026", paths: []string{"/reports/funnel/ranked?year=2026&show=plan",
			"/reports/funnel/ranked?year=2026&show=activity&stage=mql"}},
		{key: "planDetails", year: "2026", covered: func(t *testing.T, c *apitest.Client) int {
			t.Helper()
			var r struct{ Cards struct{ Records int } }
			getOK(t, c, "/reports/plan-details?year=2026&show=plan").Decode(t, &r)
			return r.Cards.Records
		}},
		{key: "summary", year: "2026", covered: func(t *testing.T, c *apitest.Client) int {
			t.Helper()
			var r struct{ FinanceCovers struct{ Of int } }
			getOK(t, c, "/reports/summary?year=2026").Decode(t, &r)
			return r.FinanceCovers.Of
		}},
	}
}

type named struct{ ID, Name string }

func getOK(t *testing.T, c *apitest.Client, path string) *apitest.Response {
	t.Helper()
	r := c.Do(t, http.MethodGet, "/api/v1"+path, nil, apitest.SkipValidation())
	if r.Status != http.StatusOK {
		t.Fatalf("GET %s = %d %s, want 200", path, r.Status, r.Body)
	}
	return r
}

// planMarkers names each plan and its activities as Alex sees them: a report that shows a plan's figures names one.
func planMarkers(t *testing.T, alex *apitest.Client) (map[string][]string, map[string]string) {
	t.Helper()
	var plans struct{ Items []named }
	getOK(t, alex, "/plans").Decode(t, &plans)
	markers, activityIDs := map[string][]string{}, map[string]string{}
	for _, plan := range plans.Items {
		var activities struct{ Items []named }
		getOK(t, alex, "/plans/"+plan.ID+"/activities").Decode(t, &activities)
		markers[plan.Name] = []string{plan.Name}
		for _, a := range activities.Items {
			markers[plan.Name] = append(markers[plan.Name], a.Name)
			activityIDs[a.Name] = a.ID
		}
	}
	return markers, activityIDs
}

func stringsIn(value any, into map[string]bool) {
	switch v := value.(type) {
	case string:
		into[v] = true
	case []any:
		for _, item := range v {
			stringsIn(item, into)
		}
	case map[string]any:
		for _, item := range v {
			stringsIn(item, into)
		}
	}
}

func plansShown(t *testing.T, r *apitest.Response, markers map[string][]string) []string {
	t.Helper()
	var body any
	r.Decode(t, &body)
	values := map[string]bool{}
	stringsIn(body, values)
	shown := []string{}
	for plan, names := range markers {
		if slices.ContainsFunc(names, func(name string) bool { return values[name] }) {
			shown = append(shown, plan)
		}
	}
	return shown
}

func frameChoices(t *testing.T, c *apitest.Client, report scopedReport) []string {
	t.Helper()
	var frame struct {
		Choices struct{ Plans []named } `json:"choices"`
	}
	getOK(t, c, "/reports/frame?report="+report.key+"&year="+report.year).Decode(t, &frame)
	names := []string{}
	for _, p := range frame.Choices.Plans {
		names = append(names, p.Name)
	}
	slices.Sort(names)
	return names
}

// view is one report as one person sees it, checked against the plans Alex sees in it.
type view struct {
	report  scopedReport
	markers map[string][]string
}

func (v view) outside(t *testing.T, c *apitest.Client, scope []string) []string {
	t.Helper()
	leaked := []string{}
	for _, path := range v.report.paths {
		for _, plan := range plansShown(t, getOK(t, c, path), v.markers) {
			if !slices.Contains(scope, plan) {
				leaked = append(leaked, plan)
			}
		}
	}
	return leaked
}

func (v view) check(t *testing.T, who string, c *apitest.Client, scope []string) {
	t.Helper()
	want := scopeIn(scope, v.report.year)
	if got := frameChoices(t, c, v.report); !slices.Equal(got, want) {
		t.Errorf("%s: %s's frame offers %v, want %v", v.report.key, who, got, want)
	}
	if v.report.covered != nil {
		if got := v.report.covered(t, c); got != len(want) {
			t.Errorf("%s: %s's report covers %d plans, want %d %v", v.report.key, who, got, len(want), want)
		}
		return
	}
	if leaked := v.outside(t, c, scope); len(leaked) > 0 {
		t.Errorf("%s: %s's answers show %v, outside the scope %v", v.report.key, who, leaked, scope)
	}
}

func TestReports_EachPersonSeesOnlyTheirScope_039_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alex := server.SignIn(t, alexEmail)
	markers, _ := planMarkers(t, alex)
	people := map[string]*apitest.Client{}
	for who := range scopeOf() {
		people[who] = server.SignIn(t, who)
	}

	for _, report := range scopedReports() {
		t.Run(report.key, func(t *testing.T) {
			t.Parallel()
			v := view{report, markers}
			alexSees, leakWouldShow := v.outside(t, alex, nil), report.covered != nil
			for who, scope := range scopeOf() {
				v.check(t, who, people[who], scope)
				leakWouldShow = leakWouldShow || slices.ContainsFunc(alexSees, func(plan string) bool {
					return !slices.Contains(scope, plan)
				})
			}
			if !leakWouldShow {
				t.Errorf("%s: Alex's answers show no plan outside anyone's scope, so a leak would not show", report.key)
			}
		})
	}
}

func TestPerformance_AnActivityOutsideTheScopeAnswersAsMissing_046_FR044(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	_, ids := planMarkers(t, server.SignIn(t, alexEmail))
	missing := string(server.SignIn(t, alexEmail).Do(t, http.MethodGet, "/api/v1/activities/A-9999/performance", nil,
		apitest.SkipRequestValidation()).Body)
	cases := []struct {
		who, activity string
		status        int
	}{
		{priyaEmail, "Grand opening Shanghai", http.StatusNotFound},
		{priyaEmail, "Helix search and social, first half", http.StatusNotFound},
		{meiEmail, "Social always-on", http.StatusNotFound},
		{saraEmail, "Helix search and social, first half", http.StatusNotFound},
		{priyaEmail, "Social always-on", http.StatusOK},
		{meiEmail, "Grand opening Shanghai", http.StatusOK},
	}
	for _, tc := range cases {
		r := server.SignIn(t, tc.who).Do(t, http.MethodGet, "/api/v1/activities/"+ids[tc.activity]+"/performance", nil,
			apitest.SkipRequestValidation())
		if r.Status != tc.status || (tc.status == http.StatusNotFound && string(r.Body) != missing) {
			t.Errorf("%s reading %s's performance = %d %s, want %d (404 as for an activity that does not exist)",
				tc.who, tc.activity, r.Status, r.Body, tc.status)
		}
	}
}
