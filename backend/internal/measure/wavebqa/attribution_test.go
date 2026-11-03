package wavebqa_test

import (
	"cmp"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	equalShares   = "Equally distributed"
	actualBasis   = "actual"
	noActualCost  = "noActualCost"
	noRevenueData = "noData"
	wholeFact     = "5000.00"
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

// checkReturns: every ROI is its figure's own credits against its own cost; groups and parents add up their parts.
func checkReturns(t *testing.T, label string, r ranked[revenueFigures]) {
	t.Helper()
	for _, f := range r.everyFigure() {
		if got, want := whole(f.ROI), roiOf(returnsIn(f)); shown(got) != shown(want) {
			t.Errorf("%s: ROI %s on %s, want %s, the API's rounding", label, shown(got), returnsIn(f), shown(want))
			return
		}
	}
	for _, g := range r.Groups {
		checkSum(t, label+", group "+g.Key, g.Totals, figuresOf(g.Entries))
		for _, e := range g.Entries {
			if len(e.Children) > 0 {
				checkSum(t, label+", "+e.Name, e.Figures, figuresOf(e.Children))
			}
		}
	}
}

func checkDemoReturns(t *testing.T, alexSees person) {
	t.Helper()
	want := map[string]string{
		helixFirstHalf:    "credited 54000.00, cost 0.00, ROI noActualCost",
		tellusCaseStudies: "credited 13405.80, cost 32608.70, ROI -59",
		tellusWebinars:    "credited 18702.90, cost 0.00, ROI noActualCost",
		socialAlwaysOn:    "credited noData, cost 20000.00, ROI noData",
		"Total":           "credited 86108.70, cost 63260.87, ROI 36",
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

func creditsByName(r ranked[revenueFigures]) map[string]string {
	out := map[string]string{}
	for _, e := range r.tops() {
		out[e.Name] = amountOr(e.Figures.AttributedRevenue, e.Figures.AttributedRevenueReason)
	}
	return out
}

// eachModel designates the five models in turn, as Alex would in Settings › Attribution, and checks each.
func eachModel(t *testing.T, alexSees person, check func(name string)) {
	t.Helper()
	settings := decode[struct {
		Version int
		Models  []struct{ Key, Name string }
	}](t, alexSees.expect(t, get(attributionPath), http.StatusOK))
	version := settings.Version
	for _, m := range settings.Models {
		saved := alexSees.expect(t, put(attributionPath, map[string]any{"model": m.Key, "version": version}), http.StatusOK)
		version = decode[struct{ Version int }](t, saved).Version
		check(m.Name)
	}
}

func countedRevenue(t *testing.T, alexSees person, ids map[string]string) int64 {
	t.Helper()
	var total int64
	for _, id := range ids {
		if a := panelOf(t, alexSees, id).Revenue.Actual; a != nil {
			total += orZero(cents(&amount{Amount: a.Amount}))
		}
	}
	return total
}

func checkModelNamed(t *testing.T, alexSees person, list ranked[revenueFigures], name string) {
	t.Helper()
	want := basisStamp{name, actualBasis}
	if league := leagueOf(t, alexSees, "roi", ""); !sameStamp(list.Attribution, &want) || !sameStamp(league.ROI, &want) {
		t.Errorf("under %s: Revenue names %+v, Summary's ROI league %+v; want %+v", name, list.Attribution, league.ROI, want)
	}
	file := alexSees.expect(t, get(reportPath("/reports/revenue/export", "widget=ranked", "format=csv", "show=activity")),
		http.StatusOK)
	headings := []string{"Attributed revenue (" + name + ")", "Actual cost", "ROI (%, " + name + ", on actual cost)"}
	if rows := csvRows(t, string(file.Body)); len(rows) == 0 || len(rows[0]) < 7 || !slices.Equal(rows[0][7:], headings) {
		t.Errorf("under %s: the ranked export's headings %v, want %v last", name, rows[:min(1, len(rows))], headings)
	}
}

// TestWaveB_ModelChangeRestates_050_SC002: under each model Revenue, Summary and the export name it, the credits add up
// to the revenue counted on the panels, a fact without a journey stays whole with its activity, and ROI follows.
func TestWaveB_ModelChangeRestates_050_SC002(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	ids := demoIDs(t, alexSees)
	upload(t, alexSees, demoFeed(t, alexSees), csvOf(fmt.Sprintf("w1,2026-02-10,%s,,,,%s,USD", ids[helixSecondHalf], wholeFact)))
	counted := countedRevenue(t, alexSees, ids)
	helix := map[string]bool{}
	eachModel(t, alexSees, func(name string) {
		list := revenueRankedOf(t, alexSees, "show=activity")
		checkModelNamed(t, alexSees, list, name)
		checkReturns(t, "Revenue under "+name, list)
		checkSummaryRoiIsRevenues(t, alexSees, "")
		credits := creditsByName(list)
		if total := cents(topOf(t, list).AttributedRevenue); shown(total) != shown(&counted) || credits[helixSecondHalf] != wholeFact {
			t.Errorf("under %s: credited %s in all, %s to %s; want the %d counted and its whole %s without a journey", name,
				shown(total), credits[helixSecondHalf], helixSecondHalf, counted, wholeFact)
		}
		helix[credits[helixFirstHalf]] = true
	})
	if len(helix) < 2 {
		t.Errorf("%s credited %v under all five models, want the model change to restate it", helixFirstHalf, helix)
	}
}
