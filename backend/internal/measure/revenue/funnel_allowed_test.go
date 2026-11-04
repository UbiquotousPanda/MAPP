package revenue_test

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

// P-2's model allows only INQ, yet its INQ goal projects MQL; MQL facts were still loaded for A-2.
func uncoveredForMQL(facts []revenue.FactTotal) *revenue.Service {
	goals := fakeGoals{
		"A-1": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: []string{"inq", "mql", "revenue"}},
		"A-2": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: []string{"inq"}},
	}
	return newFixtureWith(twoPlansScope(), goals, facts)
}

func rankedMQL(t *testing.T, s *revenue.Service) map[string]revenue.FunnelFigures {
	t.Helper()
	got, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Stage: "mql", Sort: revenue.SortProjected, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	out := map[string]revenue.FunnelFigures{}
	for _, e := range got.Groups[0].Entries {
		out[e.ID] = e.Figures
	}
	return out
}

func TestRankedFunnel_APlanWhoseModelDoesNotAllowTheStageShowsDash_FR018_049C11(t *testing.T) {
	t.Parallel()
	got := rankedMQL(t, uncoveredForMQL(nil))["A-2"]

	if got.Goal != nil || got.Actual != nil || got.Projected != nil || got.Performance != nil || got.Conversion != nil {
		t.Errorf("A-2 = goal %v actual %v projected %v performance %v conversion %v, want every figure \"—\"",
			got.Goal, got.Actual, got.Projected, got.Performance, got.Conversion)
	}
	if covered := rankedMQL(t, uncoveredForMQL(nil))["A-1"]; covered.Projected == nil {
		t.Errorf("A-1 projected = nil, want a value: its model allows MQL")
	}
}

func TestRankedFunnel_AnUncoveredPlanStillShowsItsCountedActual_FR018_FR021(t *testing.T) {
	t.Parallel()
	facts := []revenue.FactTotal{{ActivityID: "A-2", Stage: "mql", Month: "2026-02", Counts: 40, FactCount: 1}}
	got := rankedMQL(t, uncoveredForMQL(facts))["A-2"]

	if got.Actual == nil || *got.Actual != 40 {
		t.Errorf("A-2 actual = %v, want 40: a counted fact counts wherever it lands", got.Actual)
	}
	if got.Goal != nil || got.Projected != nil || got.Performance != nil {
		t.Errorf("A-2 = goal %v projected %v performance %v, want \"—\" for each", got.Goal, got.Projected, got.Performance)
	}
}

func TestFunnelCards_MatchTheRankedTotalsWithAnUncoveredPlan_FR018_SC002(t *testing.T) {
	t.Parallel()
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "mql", Month: "2026-02", Counts: 25, FactCount: 1},
		{ActivityID: "A-2", Stage: "mql", Month: "2026-02", Counts: 40, FactCount: 1},
	}
	s := uncoveredForMQL(facts)
	report, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "mql")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	ranked, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Stage: "mql", Sort: revenue.SortProjected, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	totals, alone := ranked.Groups[0].Totals, rankedMQL(t, s)["A-1"]
	assertSameFigure(t, "Actual", report.Cards.Actual.Value, 65)
	assertSameFigure(t, "Projected", report.Cards.Projected.Value, float64(*totals.Projected))
	assertSameFigure(t, "Projected", report.Cards.Projected.Value, float64(*alone.Projected))
}
