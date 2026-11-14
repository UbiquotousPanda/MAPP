package revenue_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

// roiScope is twoPlanScope with one line item under each activity, and every plan's financial data shown.
func roiScope() measure.Scope {
	sc := twoPlanScope()
	sc.Nodes = append(sc.Nodes,
		allwork.Node{Level: allwork.LevelLineItem, ID: "L-1", PlanID: "P-1", ParentID: "A-1"},
		allwork.Node{Level: allwork.LevelLineItem, ID: "L-2", PlanID: "P-2", ParentID: "A-2"})
	sc.Choices.SeesFinance = true
	return sc
}

// roiReturns credits 3,000.00 to A-1 and 500.00 to A-2, against 2,000.00 and 1,000.00 paid.
func roiReturns() fakeReturns {
	return fakeReturns{
		credits: map[string]money.Amount{"A-1": money.FromCents(300_000), "A-2": money.FromCents(50_000)},
		paid:    map[string]money.Amount{"L-1": money.FromCents(200_000), "L-2": money.FromCents(100_000)},
	}
}

func rankedROI(t *testing.T, sc measure.Scope, r fakeReturns) revenue.RevenueRanked {
	t.Helper()
	q := revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1}
	got, err := newFixtureWithReturns(sc, twoPlanGoals(), r).RankedRevenue(t.Context(), priya,
		measure.Filter{Show: "activity"}, q)
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	return got
}

func figuresByID(list revenue.RevenueRanked) map[string]revenue.RevenueFigures {
	out := map[string]revenue.RevenueFigures{}
	for _, g := range list.Groups {
		for _, e := range g.Entries {
			out[e.ID] = e.Figures
		}
	}
	return out
}

type roiRow struct {
	Credited, Cost       *int64
	ROI                  *float64
	CreditedWhy, CostWhy string
	ROIWhy               string
}

func roiRowOf(f revenue.RevenueFigures) roiRow {
	cents := func(m *money.Money) *int64 {
		if m == nil {
			return nil
		}
		c := m.Amount.Cents()
		return &c
	}
	return roiRow{Credited: cents(f.AttributedRevenue), Cost: cents(f.ActualCost), ROI: f.ROI,
		CreditedWhy: f.AttributedRevenueReason, CostWhy: f.ActualCostReason, ROIWhy: f.ROIReason}
}

func ptrTo[T any](v T) *T { return &v }

func TestRankedRevenue_ROIDividesCreditedRevenueByActualCost_050_FR007_FR010(t *testing.T) {
	t.Parallel()

	got := rankedROI(t, roiScope(), roiReturns())

	want := map[string]roiRow{
		"A-1": {Credited: ptrTo[int64](300_000), Cost: ptrTo[int64](200_000), ROI: ptrTo(50.0)},
		"A-2": {Credited: ptrTo[int64](50_000), Cost: ptrTo[int64](100_000), ROI: ptrTo(-50.0)},
	}
	for id, f := range figuresByID(got) {
		if diff := cmp.Diff(want[id], roiRowOf(f)); diff != "" {
			t.Errorf("%s (-want +got):\n%s", id, diff)
		}
	}
	// The total divides the sums: 500.00 gained on 3,000.00 is 17%, not the 0% an average of 50% and -50% gives.
	if total := roiRowOf(got.Groups[0].Totals); total.ROI == nil || *total.ROI != 17 {
		t.Errorf("total ROI = %v, want 17 from the summed figures", total.ROI)
	}
	if want := (attribution.Stamp{Model: "Equally distributed", Basis: attribution.BasisActual}); got.Attribution != want {
		t.Errorf("attribution = %+v, want %+v", got.Attribution, want)
	}
}

func TestRankedRevenue_ROIDashSaysWhy_050_FR007(t *testing.T) {
	t.Parallel()
	hidden := roiScope()
	hidden.Choices.FinancePlans = []string{"P-1"}
	unpaid, uncredited := roiReturns(), roiReturns()
	unpaid.paid = map[string]money.Amount{"L-2": money.FromCents(100_000)}
	uncredited.credits = map[string]money.Amount{"A-2": money.FromCents(50_000)}
	tests := []struct {
		name string
		sc   measure.Scope
		r    fakeReturns
		id   string
		want roiRow
	}{
		{"P-2's financial data is not shown", hidden, roiReturns(), "A-2", roiRow{Credited: ptrTo[int64](50_000),
			CostWhy: revenue.ReasonNoFinancialAccess, ROIWhy: revenue.ReasonNoFinancialAccess}},
		{"nothing paid in the year", roiScope(), unpaid, "A-1", roiRow{Credited: ptrTo[int64](300_000),
			CostWhy: revenue.ReasonNoActualCost, ROIWhy: revenue.ReasonNoActualCost}},
		{"no revenue credited", roiScope(), uncredited, "A-1", roiRow{Cost: ptrTo[int64](200_000),
			CreditedWhy: revenue.ReasonNoData, ROIWhy: revenue.ReasonNoData}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := figuresByID(rankedROI(t, tt.sc, tt.r))[tt.id]

			if diff := cmp.Diff(tt.want, roiRowOf(got)); diff != "" {
				t.Errorf("%s (-want +got):\n%s", tt.id, diff)
			}
		})
	}
}

func TestRankedRevenue_AZeroCreditIsMinusOneHundredPerCent_050_FR007(t *testing.T) {
	t.Parallel()
	r := roiReturns()
	r.credits["A-1"] = money.Amount{}

	got := figuresByID(rankedROI(t, roiScope(), r))["A-1"]

	want := roiRow{Credited: ptrTo[int64](0), Cost: ptrTo[int64](200_000), ROI: ptrTo(-100.0)}
	if diff := cmp.Diff(want, roiRowOf(got)); diff != "" {
		t.Errorf("A-1 credited nothing by the model (-want +got):\n%s", diff)
	}
}

// mixedScope hides P-2's finances and puts both activities under one owner and one 60/40 region split, so every group
// spans a plan whose cost is seen and one whose cost is not.
func mixedScope() measure.Scope {
	sc := roiScope()
	sc.Choices.FinancePlans = []string{"P-1"}
	sc.Attributes = []allwork.Attribute{{ID: "AT-1", Label: "Region",
		Options: []allwork.Option{{ID: "O-1", Label: "EMEA"}, {ID: "O-2", Label: "APAC"}}}}
	split := allwork.AttrValue{OptionIDs: []string{"O-1", "O-2"},
		Shares: map[string]money.Percent{"O-1": money.PercentFromHundredths(6000), "O-2": money.PercentFromHundredths(4000)}}
	for i, n := range sc.Nodes {
		if n.Level == allwork.LevelActivity {
			sc.Nodes[i].Owner = &allwork.Owner{ID: "U-2", Name: "Priya Raman"}
			sc.Nodes[i].Attrs = map[string]allwork.AttrValue{"AT-1": split}
		}
	}
	return sc
}

// A-2's 500.00 credit still shows, but ROI divides only A-1's 3,000.00 credit by A-1's 2,000.00 cost: 50%, not 75%,
// in the total, the owner group and each share of the % split, by month and by quarter.
func TestRankedRevenue_ROICountsOnlyTheCreditWhoseCostIsSeen_049_FR013_050_FR007(t *testing.T) {
	t.Parallel()
	service := newFixtureWithReturns(mixedScope(), twoPlanGoals(), roiReturns())

	for _, period := range []string{measure.PeriodMonth, measure.PeriodQuarter} {
		for _, group := range []string{"", "owner", "attr:AT-1"} {
			q := revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Group: group, Size: 10, Page: 1}
			got, err := service.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity", Period: period}, q)
			if err != nil {
				t.Fatalf("RankedRevenue(%s, group %q): %v", period, group, err)
			}
			for _, g := range got.Groups {
				if roi := g.Totals.ROI; roi == nil || *roi != 50 {
					t.Errorf("%s by %q, %q: ROI %v, want 50 on the part whose cost is seen", period, group, g.Label, roi)
				}
			}
		}
	}
}

func TestRankedRevenue_AHiddenPlansCreditStillShows_049_FR013(t *testing.T) {
	t.Parallel()

	got := rankedROI(t, mixedScope(), roiReturns())

	want := roiRow{Credited: ptrTo[int64](350_000), Cost: ptrTo[int64](200_000), ROI: ptrTo(50.0)}
	if diff := cmp.Diff(want, roiRowOf(got.Groups[0].Totals)); diff != "" {
		t.Errorf("totals with P-2's finances hidden (-want +got):\n%s", diff)
	}
}
