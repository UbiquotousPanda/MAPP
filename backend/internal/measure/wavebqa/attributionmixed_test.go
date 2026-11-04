package wavebqa_test

import (
	"fmt"
	"maps"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

const partnerFund = "Partner co-marketing fund"

// mixedView lets Priya read every market but see Lubricants Europe's finances alone, and credits that plan
// 40,000.00 beside the Measure plan's 86,108.70, so her sums span credit whose cost she sees and credit she does not.
func mixedView(t *testing.T) (alexSees, priyaSees person) {
	t.Helper()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees = signIn(t, server, alex)
	givePriyaAllMarkets(t, alexSees)
	ids := demoIDs(t, alexSees)
	loaded := upload(t, alexSees, demoFeed(t, alexSees), csvOf(
		fmt.Sprintf("m1,2026-02-10,%s,,,,30000.00,USD", ids[socialAlwaysOn]),
		fmt.Sprintf("m2,2026-02-12,%s,,,,10000.00,USD", ids[partnerFund])))
	if loaded.Counts.Matched != 2 {
		t.Fatalf("the two revenue facts: %+v, want both matched", loaded.Counts)
	}
	return alexSees, signIn(t, server, priya)
}

func checkMixedFigures(t *testing.T, priyaSees person) {
	t.Helper()
	want := map[string]string{
		"Total":           "credited 126108.70, cost 30652.17, ROI 30",
		lubricantsPlan:    "credited 40000.00, cost 30652.17, ROI 30",
		measurePlan:       "credited 86108.70, cost noFinancialAccess, ROI noFinancialAccess",
		socialAlwaysOn:    "credited 30000.00, cost 20000.00, ROI 50",
		partnerFund:       "credited 10000.00, cost 0.00, ROI noActualCost",
		tellusCaseStudies: "credited 13405.80, cost noFinancialAccess, ROI noFinancialAccess",
	}
	plans, activities := revenueRankedOf(t, priyaSees, "show=plan"), revenueRankedOf(t, priyaSees, "show=activity")
	got := map[string]string{"Total": topOf(t, plans).served()}
	for _, e := range append(plans.tops(), activities.tops()...) {
		if _, listed := want[e.Name]; listed {
			got[e.Name] = e.Figures.served()
		}
	}
	if !maps.Equal(got, want) {
		t.Errorf("Priya's mixed view: %v, want %v", got, want)
	}
}

// checkSegmentsAgree: Revenue grouped by each segment divides only the credit whose cost is seen, % splits included,
// and Summary's league row of each value is that group's ROI.
func checkSegmentsAgree(t *testing.T, alexSees, priyaSees person) {
	t.Helper()
	for _, s := range segmentsWanted(t, alexSees) {
		list := revenueRankedOf(t, priyaSees, "show=activity&group=attr:"+s.ID)
		checkReturns(t, "Priya's Revenue by "+s.Label, list)
		groups := map[string]*float64{}
		for _, g := range list.Groups {
			groups[g.Key] = g.Totals.ROI
		}
		for _, row := range leagueOf(t, priyaSees, "roi", "segment="+s.ID).Rows {
			if shown(units(row.Value)) != shown(whole(groups[row.Key])) {
				t.Errorf("Priya's Summary ROI by %s, %s: %s, want Revenue's group %s", s.Label, row.Name,
					shown(units(row.Value)), shown(whole(groups[row.Key])))
			}
		}
	}
}

func checkPeriodsAgree(t *testing.T, priyaSees person) {
	t.Helper()
	months, quarters := leagueOf(t, priyaSees, "roi", ""), leagueOf(t, priyaSees, "roi", "period=quarter")
	list, byQuarter := revenueRankedOf(t, priyaSees, "show=activity"), revenueRankedOf(t, priyaSees, "show=activity&period=quarter")
	if months.values() != quarters.values() || !slices.Equal(servedAll(list), servedAll(byQuarter)) {
		t.Errorf("Priya's ROI by quarter: Summary %s, Revenue %v; want the months' %s, %v", quarters.values(),
			servedAll(byQuarter), months.values(), servedAll(list))
	}
}

func servedAll(r ranked[revenueFigures]) []string {
	var out []string
	for _, f := range r.everyFigure() {
		out = append(out, f.served())
	}
	return out
}

// TestWaveB_RoiOnMixedFinance_050_FR007: where a person sees some plans' finances, every ROI divides only the credit
// whose cost is seen, Summary's as Revenue's, by segment, % split and quarter, while the credit shown stays whole.
func TestWaveB_RoiOnMixedFinance_050_FR007(t *testing.T) {
	t.Parallel()
	alexSees, priyaSees := mixedView(t)
	for _, show := range levels() {
		for _, group := range []string{"none", "plan", "owner"} {
			query := joined("show="+show, "group="+group)
			list := revenueRankedOf(t, priyaSees, query)
			checkReturns(t, "Priya's Revenue at "+query, list)
			if got, want := creditsOf(list), creditsOf(revenueRankedOf(t, alexSees, query)); !slices.Equal(got, want) {
				t.Errorf("Priya's credited revenue at %s = %v, want the whole credit, Alex's %v", query, got, want)
			}
		}
	}
	checkMixedFigures(t, priyaSees)
	checkSegmentsAgree(t, alexSees, priyaSees)
	checkPeriodsAgree(t, priyaSees)
	for _, query := range []string{"", "period=quarter", "plan=" + frameOf(t, alexSees, "summary").planID(lubricantsPlan)} {
		checkSummaryRoiIsRevenues(t, priyaSees, query)
	}
}
