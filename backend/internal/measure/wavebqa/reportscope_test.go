package wavebqa_test

import (
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

// reportPlans are the 2026 plans each demo role's reports.view scope reaches (Roles and what they must see).
func reportPlans() map[string][]string {
	all := []string{lubricantsPlan, mobilityPlan, measurePlan}
	return map[string][]string{alex: all, carlos: all, lea: all, priya: {lubricantsPlan}, daniel: {lubricantsPlan},
		mei: {mobilityPlan}, sara: {lubricantsPlan, mobilityPlan}}
}

type reportFrame struct {
	Filter struct {
		Plans []string `json:"plans"`
	} `json:"filter"`
	Choices struct {
		Plans []ref `json:"plans"`
	} `json:"choices"`
	Finance struct{ Plans, Of int } `json:"finance"`
	LeftOut int                     `json:"leftOut"`
}

func frameOf(t *testing.T, who person, report string, params ...string) reportFrame {
	t.Helper()
	path := reportPath("/reports/frame", append([]string{"report=" + report}, params...)...)
	return decode[reportFrame](t, who.expect(t, get(path), http.StatusOK))
}

func (f reportFrame) planNames() []string {
	names := []string{}
	for _, p := range f.Choices.Plans {
		names = append(names, p.Name)
	}
	slices.Sort(names)
	return names
}

func (f reportFrame) planIDs() []string {
	ids := []string{}
	for _, p := range f.Choices.Plans {
		ids = append(ids, p.ID)
	}
	return ids
}

func (f reportFrame) planID(name string) string {
	i := slices.IndexFunc(f.Choices.Plans, func(p ref) bool { return p.Name == name })
	if i < 0 {
		return ""
	}
	return f.Choices.Plans[i].ID
}

// scoped is what one person may see: the plans' names and IDs.
type scoped struct{ names, ids []string }

// rankedPlans checks a ranked answer at show=plan names exactly the plans, and no entry or child of another plan.
func rankedPlans[F any](t *testing.T, label string, r ranked[F], want scoped) {
	t.Helper()
	names, ids := want.names, want.ids
	got := []string{}
	for _, e := range r.tops() {
		got = append(got, e.Name)
		for _, child := range e.Children {
			if !slices.Contains(ids, child.PlanID) {
				t.Errorf("%s: %s of plan %s, outside the scope %v", label, child.Name, child.PlanID, ids)
			}
		}
	}
	slices.Sort(got)
	if !slices.Equal(got, names) {
		t.Errorf("%s at show=plan names %v, want %v", label, got, names)
	}
}

func activitiesWithin[F any](t *testing.T, label string, r ranked[F], ids []string) {
	t.Helper()
	for _, e := range r.tops() {
		if !slices.Contains(ids, e.PlanID) {
			t.Errorf("%s at show=activity: %s of plan %s, outside the scope %v", label, e.Name, e.PlanID, ids)
		}
	}
}

func checkReportScope(t *testing.T, who person, names []string) {
	t.Helper()
	frames := []reportFrame{frameOf(t, who, "revenue"), frameOf(t, who, "funnel")}
	for _, f := range frames {
		if got := f.planNames(); !slices.Equal(got, names) {
			t.Errorf("%s's frame offers %v, want %v", who.email, got, names)
		}
	}
	ids := frames[0].planIDs()
	rankedPlans(t, who.email+"'s Revenue", revenueRankedOf(t, who, "show=plan"), scoped{names, ids})
	rankedPlans(t, who.email+"'s Funnel stages", funnelRankedOf(t, who, "show=plan"), scoped{names, ids})
	activitiesWithin(t, who.email+"'s Revenue", revenueRankedOf(t, who, "show=activity"), ids)
	activitiesWithin(t, who.email+"'s Funnel stages", funnelRankedOf(t, who, "show=activity&stage=mql"), ids)
}

// TestWaveB_ScopePerRole_FR003: each role's frame and ranked lists name only the plans in its scope.
func TestWaveB_ScopePerRole_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	for who, names := range reportPlans() {
		want := slices.Clone(names)
		slices.Sort(want)
		checkReportScope(t, signIn(t, server, who), want)
	}

	priyaSees := signIn(t, server, priya)
	measureID := frameOf(t, signIn(t, server, alex), "revenue").planID(measurePlan)
	asked := frameOf(t, priyaSees, "revenue", "plan="+measureID)
	if len(asked.Filter.Plans) != 0 || asked.LeftOut != 1 {
		t.Errorf("Priya asking for %s by ID: filter plans %v, left out %d; want it dropped and counted (039 FR-029)",
			measureID, asked.Filter.Plans, asked.LeftOut)
	}
	rankedPlans(t, "Priya with the Measure plan's ID", revenueRankedOf(t, priyaSees, "show=plan&plan="+measureID),
		scoped{[]string{lubricantsPlan}, asked.planIDs()})
}

type catalogueEntry struct {
	Key       string `json:"key"`
	Name      string `json:"name"`
	Available bool   `json:"available"`
}

// TestWaveB_CatalogueMatchesAccess_FR001: Revenue and Funnel stages are offered to all seven and open for each.
func TestWaveB_CatalogueMatchesAccess_FR001(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	want := []catalogueEntry{{"revenue", "Revenue", true}, {"funnel", "Funnel stages", true}}
	for _, who := range []string{alex, carlos, priya, daniel, mei, sara, lea} {
		p := signIn(t, server, who)
		listed := decode[struct{ Items []catalogueEntry }](t, p.expect(t, get("/reports"), http.StatusOK))
		for _, w := range want {
			if !slices.Contains(listed.Items, w) {
				t.Errorf("%s's catalogue = %+v, want %+v listed and available", who, listed.Items, w)
			}
		}
		for _, path := range []string{"/reports/revenue", "/reports/revenue/ranked", "/reports/funnel",
			"/reports/funnel/ranked"} {
			p.expect(t, get(reportPath(path)), http.StatusOK)
		}
	}
}

func costless(t *testing.T, label string, r ranked[revenueFigures], reason string) {
	t.Helper()
	for _, f := range r.everyFigure() {
		if f.ActualCost != nil || f.ROI != nil || (reason != "" && (f.ActualCostReason != reason || f.ROIReason != reason)) {
			t.Errorf("%s: actual cost %v, ROI %v, reasons %q %q; want both null, reason %q", label, f.ActualCost, f.ROI,
				f.ActualCostReason, f.ROIReason, reason)
			return
		}
	}
}

// TestWaveB_NoFinancialAccess_Revenue_039_FR004: Lea's frame covers no plan's finances; no actual cost or ROI, each
// saying so, while she sees Alex's credited revenue.
func TestWaveB_NoFinancialAccess_Revenue_039_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	leaSees, alexSees := signIn(t, server, lea), signIn(t, server, alex)
	for _, report := range []string{"revenue", "funnel"} {
		if f := frameOf(t, leaSees, report); f.Finance.Plans != 0 || f.Finance.Of != 3 {
			t.Errorf("Lea's %s frame: finance covers %d of %d plans, want 0 of 3", report, f.Finance.Plans, f.Finance.Of)
		}
	}
	for _, show := range levels() {
		for _, group := range []string{"none", "plan", "owner"} {
			query := joined("show="+show, "group="+group)
			list := revenueRankedOf(t, leaSees, query)
			costless(t, "Lea's Revenue at "+query, list, noFinance)
			if got, want := creditsOf(list), creditsOf(revenueRankedOf(t, alexSees, query)); !slices.Equal(got, want) {
				t.Errorf("Lea's credited revenue at %s = %v, want Alex's %v", query, got, want)
			}
		}
	}
	revenueOf(t, leaSees, "")
}
