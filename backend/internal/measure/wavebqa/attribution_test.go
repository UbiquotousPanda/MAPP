package wavebqa_test

import (
	"cmp"
	"fmt"
	"maps"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	equalShares   = "Equally distributed"
	actualBasis   = "actual"
	noActualCost  = "noActualCost"
	noRevenueData = "noData"
)

type basisStamp struct{ Model, Basis string }

func sameStamp(a, b *basisStamp) bool {
	return a != nil && b != nil && *a == *b
}

// returns are an entry's credited revenue and actual cost in cents, nil where the API serves "—".
type returns struct{ credited, cost *int64 }

func returnsIn(f revenueFigures) returns {
	return returns{cents(f.AttributedRevenue), cents(f.ActualCost)}
}

func (r returns) String() string {
	return "credited " + shown(r.credited) + ", cost " + shown(r.cost)
}

func plus(a, b *int64) *int64 {
	if a == nil || b == nil {
		return cmp.Or(a, b)
	}
	sum := *a + *b
	return &sum
}

// partsSum adds the parts' returns; a sum stays "—" while no part has a figure, as the API adds them.
func partsSum(parts []revenueFigures) returns {
	var r returns
	for _, f := range parts {
		r.credited, r.cost = plus(r.credited, cents(f.AttributedRevenue)), plus(r.cost, cents(f.ActualCost))
	}
	return r
}

// roiOf is 050's ROI as the API rounds it: (credited − cost) ÷ cost in whole per cent, halves away from zero.
func roiOf(r returns) *int64 {
	if r.credited == nil || r.cost == nil || *r.cost <= 0 {
		return nil
	}
	gain, sign := (*r.credited-*r.cost)*100, int64(1)
	if gain < 0 {
		gain, sign = -gain, -1
	}
	rounded := sign * ((2*gain + *r.cost) / (2 * *r.cost))
	return &rounded
}

func amountOr(a *amount, reason string) string {
	if a == nil {
		return reason
	}
	return a.Amount
}

func (f revenueFigures) served() string {
	roi := f.ROIReason
	if f.ROI != nil {
		roi = shown(whole(f.ROI))
	}
	return fmt.Sprintf("credited %s, cost %s, ROI %s", amountOr(f.AttributedRevenue, f.AttributedRevenueReason),
		amountOr(f.ActualCost, f.ActualCostReason), roi)
}

func figuresOf(entries []entry[revenueFigures]) []revenueFigures {
	out := make([]revenueFigures, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.Figures)
	}
	return out
}

func groupTotals(r ranked[revenueFigures]) []revenueFigures {
	out := make([]revenueFigures, 0, len(r.Groups))
	for _, g := range r.Groups {
		out = append(out, g.Totals)
	}
	return out
}

func topOf(t *testing.T, r ranked[revenueFigures]) revenueFigures {
	t.Helper()
	if len(r.Groups) != 1 {
		t.Fatalf("an ungrouped ranked list with %d groups, want one", len(r.Groups))
	}
	return r.Groups[0].Totals
}

func checkSum(t *testing.T, label string, all revenueFigures, parts []revenueFigures) {
	t.Helper()
	if got, want := returnsIn(all), partsSum(parts); got.String() != want.String() {
		t.Errorf("%s: %s, want its %d parts' sum, %s", label, got, len(parts), want)
	}
}

// visibleCredit is the credit of the parts whose cost the person sees: all a sum's ROI may divide.
func visibleCredit(parts []revenueFigures) *int64 {
	var credited *int64
	for _, f := range parts {
		if f.ActualCost != nil {
			credited = plus(credited, cents(f.AttributedRevenue))
		}
	}
	return credited
}

func checkROI(t *testing.T, label string, f revenueFigures, credited *int64) {
	t.Helper()
	on := returns{credited, cents(f.ActualCost)}
	if got, want := whole(f.ROI), roiOf(on); shown(got) != shown(want) {
		t.Errorf("%s: ROI %s, want %s on %s, the API's rounding", label, shown(got), shown(want), on)
	}
}

func checkWhole(t *testing.T, label string, all revenueFigures, parts []revenueFigures) {
	t.Helper()
	checkSum(t, label, all, parts)
	checkROI(t, label, all, visibleCredit(parts))
}

// checkReturns: each row's ROI is its own credit against its own cost; a group or parent adds up its parts and
// divides the credit of those whose cost is seen.
func checkReturns(t *testing.T, label string, r ranked[revenueFigures]) {
	t.Helper()
	for _, g := range r.Groups {
		checkWhole(t, label+", group "+g.Key, g.Totals, figuresOf(g.Entries))
		for _, e := range g.Entries {
			rows := append([]entry[revenueFigures]{e}, e.Children...)
			if len(e.Children) > 0 {
				checkWhole(t, label+", "+e.Name, e.Figures, figuresOf(e.Children))
				rows = e.Children
			}
			for _, row := range rows {
				checkROI(t, label+", "+row.Name, row.Figures, cents(row.Figures.AttributedRevenue))
			}
		}
	}
}

func checkDemoReturns(t *testing.T, alexSees person) {
	t.Helper()
	want := map[string]string{
		helixFirstHalf:    "credited 54000.00, cost 0.00, ROI noActualCost",
		tellusCaseStudies: "credited 13703.70, cost 33333.33, ROI -59",
		tellusWebinars:    "credited 18851.86, cost 0.00, ROI noActualCost",
		socialAlwaysOn:    "credited noData, cost 21066.67, ROI noData",
		"Total":           "credited 86555.56, cost 65288.89, ROI 33",
	}
	list := revenueRankedOf(t, alexSees, "show=activity")
	got := map[string]string{"Total": topOf(t, list).served()}
	for _, e := range list.tops() {
		if _, listed := want[e.Name]; listed {
			got[e.Name] = e.Figures.served()
		}
	}
	if !maps.Equal(got, want) {
		t.Errorf("the demo under %s: %v, want %v, as PostgreSQL serves it", equalShares, got, want)
	}
}

// TestWaveB_RoiIsCreditOverCost_050_FR007: each ROI divides its entry's own credits by its own payments, and a parent's
// or group's credits and cost add up its parts, at every level, grouping and category, so no ROI is an average.
func TestWaveB_RoiIsCreditOverCost_050_FR007(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	digital := "category=" + categoryNamed(t, alexSees, "Digital")
	for _, show := range levels() {
		for _, category := range []string{"", digital} {
			label := "Revenue at " + joined("show="+show, category)
			all := revenueRankedOf(t, alexSees, joined("show="+show, category))
			checkReturns(t, label, all)
			for _, group := range []string{"plan", "owner"} {
				byGroup := revenueRankedOf(t, alexSees, joined("show="+show, "group="+group, category))
				checkReturns(t, label+" by "+group, byGroup)
				checkSum(t, label+" by "+group+", the groups", topOf(t, all), groupTotals(byGroup))
			}
		}
	}
	checkDemoReturns(t, alexSees)
}

func summaryReason(roiReason string) string {
	return map[string]string{"": "null", noActualCost: "No cost recorded", noFinance: noFinanceReason,
		noRevenueData: "No revenue is credited to these activities"}[roiReason]
}

func checkSummaryRoiIsRevenues(t *testing.T, who person, query string) {
	t.Helper()
	league, list := leagueOf(t, who, "roi", query), revenueRankedOf(t, who, joined("show=plan", query))
	top := topOf(t, list)
	if shown(units(league.Total)) != shown(whole(top.ROI)) || textOf(league.Reason) != summaryReason(top.ROIReason) ||
		!sameStamp(league.ROI, list.Attribution) {
		t.Errorf("%s's Summary %q: ROI total %s, reason %s, %+v; want Revenue's %s, %q, %+v", who.email, query,
			shown(units(league.Total)), textOf(league.Reason), league.ROI, shown(whole(top.ROI)),
			summaryReason(top.ROIReason), list.Attribution)
	}
}

// TestWaveB_SummaryRoiIsRevenues_050_FR010: Summary's ROI league total is Revenue's top-level ROI for the same filters,
// on the same model, or "—" for the same reason; Lea's for want of financial access.
func TestWaveB_SummaryRoiIsRevenues_050_FR010(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	for _, query := range summaryQueries(t, alexSees) {
		checkSummaryRoiIsRevenues(t, alexSees, query)
	}
	checkSummaryRoiIsRevenues(t, signIn(t, server, lea), "")
}

func creditsOf(r ranked[revenueFigures]) []string {
	var out []string
	for _, f := range r.everyFigure() {
		out = append(out, amountOr(f.AttributedRevenue, f.AttributedRevenueReason))
	}
	return out
}
