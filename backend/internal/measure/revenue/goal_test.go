package revenue_test

import (
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

// withGoalsAsShown gives n the goals allwork shows for 365,000 INQ under lubricantsModel's waterfall:
// 7,300 MQL and 365 deals, so 3,650,000.00 USD.
func withGoalsAsShown(n allwork.Node) allwork.Node {
	mql, revenueGoal := int64(7_300), money.FromCents(365_000_000)
	n.INQ, n.MQL, n.Revenue = inqGoal(365_000), &mql, &revenueGoal
	return n
}

func TestRevenueGoal_IsTheSumOfTheActivitiesGoalsNotTheInYearProjection_FR023_049C16(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(oneActivityScope(), goals, nil)
	f := measure.Filter{Show: measure.ShowActivity}

	report, err := s.Report(t.Context(), priya, f)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	ranked, err := s.RankedRevenue(t.Context(), priya, f,
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if got := report.Cards.Goal.Value; got == nil || got.Amount.Cents() != 365_000_000 {
		t.Errorf("Goal card = %v, want the activity's own 3,650,000.00 USD", got)
	}
	if got := ranked.Groups[0].Entries[0].Figures.Goal; got == nil || got.Amount.Cents() != 365_000_000 {
		t.Errorf("ranked Goal = %v, want the activity's own 3,650,000.00 USD", got)
	}
}

func TestFunnelGoal_IsTheSumOfTheActivitiesGoalsNotTheInYearProjection_FR023_049C16(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(oneActivityScope(), goals, nil)
	f := measure.Filter{Show: measure.ShowActivity}

	report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageMQL)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	ranked, err := s.RankedFunnel(t.Context(), priya, f, revenue.RankedQuery{Sort: revenue.SortProjected,
		Order: revenue.OrderDesc, Size: 10, Page: 1, Stage: revenue.StageMQL})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	assertSameFigure(t, "MQL Goal", report.Cards.Goal.Value, 7_300)
	if got := ranked.Groups[0].Entries[0].Figures.Goal; got == nil || *got != 7_300 {
		t.Errorf("ranked MQL Goal = %v, want the activity's own 7,300", got)
	}
}

// The reports read the projection engine, so a goal of zero is no goal there too: no projection, the word "No goal".
func TestReports_AGoalOfZeroIsNoGoal_047C17_048C1(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	zero, none := int64(0), money.Amount{}
	sc.Nodes[0].INQ, sc.Nodes[0].MQL, sc.Nodes[0].Revenue = &zero, &zero, &none
	s := newFixtureWith(sc, fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}, nil)

	report, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	funnel, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, revenue.StageINQ)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}

	for name, card := range map[string]revenue.PerformanceCard{
		"Revenue": report.Cards.Performance, "Funnel INQ": funnel.Cards.Performance,
	} {
		if card.Value != nil || card.Variance != revenue.NoGoal {
			t.Errorf("%s Performance = %+v, want no figure and the word No goal", name, card)
		}
	}
	if report.Cards.Projected.Value != nil || funnel.Cards.Projected.Value != nil {
		t.Errorf("Projected = %v and %v, want none: nothing projects from a goal of zero",
			report.Cards.Projected.Value, funnel.Cards.Projected.Value)
	}
}
