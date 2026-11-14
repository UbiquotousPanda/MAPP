package revenue_test

import (
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// A plain multiple choice has no shares, so the record is split equally between its options, as a % split would
// split it, and the group rows add up to the Total.
func TestRankedRevenue_PlainMultipleChoiceSplitsEqually_059_FR003(t *testing.T) {
	t.Parallel()
	for _, options := range [][]string{{"O-1", "O-2"}, {"O-1", "O-2", "O-3"}} {
		start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
		nodes := []allwork.Node{{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end,
			Attrs: map[string]allwork.AttrValue{"AT-1": {OptionIDs: options}}}}
		sc := measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Activities: []string{"A-1"}},
			Attributes: []allwork.Attribute{{ID: "AT-1", Label: "Channel", Options: []allwork.Option{
				{ID: "O-1", Label: "External"}, {ID: "O-2", Label: "Partners"}, {ID: "O-3", Label: "Internal"}}}},
			Currency: allwork.Currency{Code: "USD"}}
		s := newFixtureWith(sc, fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}, nil)

		got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
			revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Group: "attr:AT-1", Size: 10, Page: 1})
		if err != nil {
			t.Fatalf("RankedRevenue: %v", err)
		}
		whole := centsOf(got.Totals.Projected)
		var sum, goals int64
		for _, g := range got.Groups {
			sum, goals = sum+centsOf(g.Totals.Projected), goals+centsOf(g.Totals.Goal)
			if part := centsOf(g.Totals.Projected); part*int64(len(options)) > whole+whole/1000 {
				t.Errorf("%d options: %s = %d cents, want an equal share of %d", len(options), g.Label, part, whole)
			}
		}
		if len(got.Groups) != len(options) || sum != whole || goals != centsOf(got.Totals.Goal) {
			t.Errorf("%d options: %d groups summing to %d (goal %d), want %d groups adding up to the Total %d (goal %d)",
				len(options), len(got.Groups), sum, goals, len(options), whole, centsOf(got.Totals.Goal))
		}
	}
}

// Nothing paid is no cost data: "—" with its reason in the rows and the Total row, never 0.00.
func TestRankedRevenue_NoCostPaidIsADashNotZero_059(t *testing.T) {
	t.Parallel()
	unpaid := roiReturns()
	unpaid.paid = map[string]money.Amount{}

	got := rankedROI(t, roiScope(), unpaid)

	for _, f := range append([]revenue.RevenueFigures{got.Totals, got.Groups[0].Totals}, entryFigures(got)...) {
		if f.ActualCost != nil || f.ActualCostReason != revenue.ReasonNoActualCost {
			t.Errorf("cost = %v (%q), want — with %q", f.ActualCost, f.ActualCostReason, revenue.ReasonNoActualCost)
		}
	}
}

func entryFigures(list revenue.RevenueRanked) []revenue.RevenueFigures {
	var out []revenue.RevenueFigures
	for _, f := range figuresByID(list) {
		out = append(out, f)
	}
	return out
}
