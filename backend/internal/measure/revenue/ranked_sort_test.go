package revenue_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// aheadBehindScope is three activities with the same projection: Ahead (small goals, high performance), Behind
// (large goals, low performance) and No goal.
func aheadBehindScope() measure.Scope {
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	node := func(id, name string, mql *int64, goal *money.Amount) allwork.Node {
		return allwork.Node{Level: allwork.LevelActivity, ID: id, PlanID: "P-1", Name: name, INQ: inqGoal(365_000),
			MQL: mql, Revenue: goal, StartDate: &start, EndDate: &end}
	}
	small, large := money.FromCents(100_000_000), money.FromCents(2_000_000_000)
	return measure.Scope{Year: 2026, Currency: allwork.Currency{Code: "USD"},
		Nodes: []allwork.Node{node("A-1", "Ahead", inqGoal(1_000), &small),
			node("A-2", "Behind", inqGoal(100_000), &large), node("A-3", "No goal", nil, nil)},
		Matched: allwork.Matched{Activities: []string{"A-1", "A-2", "A-3"}}}
}

var goalOrPerformanceOrders = []struct {
	sort, order string
	want        []string
}{
	{revenue.SortPerformance, revenue.OrderAsc, []string{"A-2", "A-1", "A-3"}},
	{revenue.SortPerformance, revenue.OrderDesc, []string{"A-1", "A-2", "A-3"}},
	{revenue.SortGoal, revenue.OrderAsc, []string{"A-1", "A-2", "A-3"}},
	{revenue.SortGoal, revenue.OrderDesc, []string{"A-2", "A-1", "A-3"}},
}

func aheadBehindService() *revenue.Service {
	m := revenue.ActivityGoals{Model: lubricantsModel()}
	return newFixtureWith(aheadBehindScope(), fakeGoals{"A-1": m, "A-2": m, "A-3": m}, nil)
}

func TestRankedRevenue_SortsByGoalAndPerformanceWithoutAFigureLast_D410(t *testing.T) {
	t.Parallel()
	s := aheadBehindService()
	for _, tc := range goalOrPerformanceOrders {
		got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
			revenue.RankedQuery{Sort: tc.sort, Order: tc.order, Size: 10, Page: 1})
		if err != nil {
			t.Fatalf("RankedRevenue: %v", err)
		}
		ids := []string{}
		for _, e := range got.Groups[0].Entries {
			ids = append(ids, e.ID)
		}
		if diff := cmp.Diff(tc.want, ids); diff != "" {
			t.Errorf("%s %s (-want +got):\n%s", tc.sort, tc.order, diff)
		}
	}
}

func TestRankedFunnel_SortsByGoalAndPerformanceWithoutAFigureLast_D410(t *testing.T) {
	t.Parallel()
	s := aheadBehindService()
	for _, tc := range goalOrPerformanceOrders {
		got, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "activity"},
			revenue.RankedQuery{Sort: tc.sort, Order: tc.order, Size: 10, Page: 1, Stage: revenue.StageMQL})
		if err != nil {
			t.Fatalf("RankedFunnel: %v", err)
		}
		ids := []string{}
		for _, e := range got.Groups[0].Entries {
			ids = append(ids, e.ID)
		}
		if diff := cmp.Diff(tc.want, ids); diff != "" {
			t.Errorf("%s %s (-want +got):\n%s", tc.sort, tc.order, diff)
		}
	}
}
