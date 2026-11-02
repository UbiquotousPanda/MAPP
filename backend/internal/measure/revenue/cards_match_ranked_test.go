package revenue_test

import (
	"testing"
	"time"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

// midAugust leaves July a finished month inside the quarter in progress, and August the month in progress.
var midAugust = time.Date(2026, 8, 15, 12, 0, 0, 0, time.UTC)

var bothPeriods = []string{measure.PeriodMonth, measure.PeriodQuarter}

func julyAndAugustFacts(stage string, july, august int64) []revenue.FactTotal {
	if stage == "revenue" {
		return []revenue.FactTotal{
			{ActivityID: "A-1", Stage: stage, Month: "2026-07", Currency: "USD", AmountMinor: july, FactCount: 1},
			{ActivityID: "A-1", Stage: stage, Month: "2026-08", Currency: "USD", AmountMinor: august, FactCount: 1},
		}
	}
	return []revenue.FactTotal{
		{ActivityID: "A-1", Stage: stage, Month: "2026-07", Counts: july, FactCount: 1},
		{ActivityID: "A-1", Stage: stage, Month: "2026-08", Counts: august, FactCount: 1},
	}
}

func TestRevenueCards_MatchTheRankedTotalWhenTheMonthInProgressHasFacts_FR004_FR010_SC002(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureAt(midAugust, oneActivityScope(), goals, julyAndAugustFacts("revenue", 1_000_000, 500_000))
	for _, period := range bothPeriods {
		f := measure.Filter{Period: period, Show: measure.ShowActivity}
		report, err := s.Report(t.Context(), priya, f)
		if err != nil {
			t.Fatalf("%s: Report: %v", period, err)
		}
		ranked, err := s.RankedRevenue(t.Context(), priya, f,
			revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
		if err != nil {
			t.Fatalf("%s: RankedRevenue: %v", period, err)
		}
		entry := ranked.Groups[0].Entries[0].Figures
		if got, want := report.Cards.Projected.Value.Amount, entry.Projected.Amount; got.Cents() != want.Cents() {
			t.Errorf("%s: Projected card = %s, want the ranked total %s", period, got, want)
		}
		if got, want := report.Cards.Actual.Value.Amount, entry.Actual.Amount; got.Cents() != want.Cents() {
			t.Errorf("%s: Actual card = %s, want the ranked actual %s", period, got, want)
		}
		if *report.Cards.Performance.Value != *entry.Performance {
			t.Errorf("%s: Performance card = %v, want the ranked %v", period, *report.Cards.Performance.Value, *entry.Performance)
		}
	}
}

func TestFunnelCards_MatchTheRankedTotalWhenTheMonthInProgressHasFacts_FR004_FR010_FR017(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := append(julyAndAugustFacts(revenue.StageINQ, 400, 300), julyAndAugustFacts(revenue.StageMQL, 20, 9)...)
	s := newFixtureAt(midAugust, oneActivityScope(), goals, facts)
	for _, period := range bothPeriods {
		f := measure.Filter{Period: period, Show: measure.ShowActivity}
		report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageMQL)
		if err != nil {
			t.Fatalf("%s: FunnelReport: %v", period, err)
		}
		ranked, err := s.RankedFunnel(t.Context(), priya, f, revenue.RankedQuery{Sort: revenue.SortProjected,
			Order: revenue.OrderDesc, Size: 10, Page: 1, Stage: revenue.StageMQL})
		if err != nil {
			t.Fatalf("%s: RankedFunnel: %v", period, err)
		}
		entry := ranked.Groups[0].Entries[0].Figures
		assertSameFigure(t, period+" Projected", report.Cards.Projected.Value, float64(*entry.Projected))
		assertSameFigure(t, period+" Actual", report.Cards.Actual.Value, float64(*entry.Actual))
		assertSameFigure(t, period+" Performance", report.Cards.Performance.Value, *entry.Performance)
		assertSameFigure(t, period+" Conversion", report.Cards.Conversion.Value, *entry.Conversion)
	}
}

func TestFunnelCards_ConversionCountsTheMonthInProgressOnBothSides_FR017(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := append(julyAndAugustFacts(revenue.StageINQ, 400, 600), julyAndAugustFacts(revenue.StageMQL, 20, 30)...)
	s := newFixtureAt(midAugust, oneActivityScope(), goals, facts)

	report, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, revenue.StageMQL)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	assertSameFigure(t, "Actual MQL", report.Cards.Actual.Value, 50)
	// 50 MQL out of 1,000 INQ, both counted to today.
	assertSameFigure(t, "Conversion", report.Cards.Conversion.Value, 5)
}

func assertSameFigure(t *testing.T, name string, card *float64, want float64) {
	t.Helper()
	if card == nil {
		t.Errorf("%s card = —, want %v", name, want)
		return
	}
	if *card != want {
		t.Errorf("%s card = %v, want %v", name, *card, want)
	}
}
