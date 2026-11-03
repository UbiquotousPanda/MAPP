package revenue_test

import (
	"strconv"
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

func TestSumMonths_IsWhatTheRevenueCardsAndRankedRowsShow_048C10_SC002(t *testing.T) {
	t.Parallel()
	for name, sc := range map[string]measure.Scope{"projects": oneActivityScope(), "no goals": activityWithoutGoalsScope()} {
		goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
		s := newFixtureAt(midAugust, sc, goals, julyAndAugustFacts("revenue", 1_000_000, 500_000))
		f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}
		series, err := s.ActivitySeries(t.Context(), priya, f, "")
		if err != nil {
			t.Fatalf("%s: ActivitySeries: %v", name, err)
		}
		report, err := s.Report(t.Context(), priya, f)
		if err != nil {
			t.Fatalf("%s: Report: %v", name, err)
		}
		sums := revenue.SumMonths(series, revenue.RevenueMeasure())
		if got, want := sums.Total(), centsOf(report.Cards.Projected.Value); got != want {
			t.Errorf("%s: SumMonths Total = %d, want the Projected card %d", name, got, want)
		}
		if got, want := sums.ActualTotal(), centsOf(report.Cards.Actual.Value); got != want {
			t.Errorf("%s: SumMonths ActualTotal = %d, want the Actual card %d", name, got, want)
		}
		ranked, err := s.RankedRevenue(t.Context(), priya, f,
			revenue.RankedQuery{Sort: revenue.SortActualRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
		if err != nil {
			t.Fatalf("%s: RankedRevenue: %v", name, err)
		}
		own := revenue.OwnFigureOf(series[0], revenue.RevenueMeasure())
		if got, want := derefOr(own.Actual), centsOf(ranked.Groups[0].Entries[0].Figures.Actual); got != want {
			t.Errorf("%s: OwnFigureOf Actual = %d, want the ranked row's %d", name, got, want)
		}
	}
}

func TestSumMonths_IsWhatTheFunnelCardsShow_048C10_SC002(t *testing.T) {
	t.Parallel()
	for name, sc := range map[string]measure.Scope{"projects": oneActivityScope(), "no goals": activityWithoutGoalsScope()} {
		goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
		s := newFixtureAt(midAugust, sc, goals, julyAndAugustFacts(revenue.StageINQ, 40, 20))
		f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}
		series, err := s.ActivitySeries(t.Context(), priya, f, "")
		if err != nil {
			t.Fatalf("%s: ActivitySeries: %v", name, err)
		}
		report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageINQ)
		if err != nil {
			t.Fatalf("%s: FunnelReport: %v", name, err)
		}
		sums := revenue.SumMonths(series, revenue.StageMeasure(revenue.StageINQ))
		if projected := report.Cards.Projected.Value; projected == nil || int64(*projected) != sums.Total() {
			t.Errorf("%s: SumMonths Total = %d, want the Projected card %s", name, sums.Total(), cardText(projected))
		}
		card := report.Cards.Actual.Value
		if card == nil || int64(*card) != sums.ActualTotal() {
			t.Errorf("%s: SumMonths ActualTotal = %d, want the Actual card %s", name, sums.ActualTotal(), cardText(card))
		}
	}
}

func derefOr(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func cardText(v *float64) string {
	if v == nil {
		return "null"
	}
	return strconv.FormatFloat(*v, 'f', -1, 64)
}
