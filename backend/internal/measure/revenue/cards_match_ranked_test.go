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

func TestCards_CountTheFactsOfAnActivityWithoutAProjection_FR009_SC002(t *testing.T) {
	t.Parallel()
	for _, stage := range []string{"revenue", revenue.StageINQ} {
		s := newFixtureAt(midAugust, activityWithoutGoalsScope(), fakeGoals{}, julyAndAugustFacts(stage, 1_000_000, 500_000))
		f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}
		cardActual, rankedActual := actualsOf(t, s, f, stage)
		if cardActual != rankedActual {
			t.Errorf("%s: Actual card = %d, want the ranked actual %d: facts count without a goal", stage, cardActual, rankedActual)
		}
	}
}

func actualsOf(t *testing.T, s *revenue.Service, f measure.Filter, stage string) (card, ranked int64) {
	t.Helper()
	if stage == "revenue" {
		report, err := s.Report(t.Context(), priya, f)
		if err != nil {
			t.Fatalf("Report: %v", err)
		}
		list, err := s.RankedRevenue(t.Context(), priya, f,
			revenue.RankedQuery{Sort: revenue.SortActualRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
		if err != nil {
			t.Fatalf("RankedRevenue: %v", err)
		}
		return centsOf(report.Cards.Actual.Value), centsOf(list.Groups[0].Entries[0].Figures.Actual)
	}
	report, err := s.FunnelReport(t.Context(), priya, f, stage)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	list, err := s.RankedFunnel(t.Context(), priya, f,
		revenue.RankedQuery{Sort: revenue.SortActual, Order: revenue.OrderDesc, Size: 10, Page: 1, Stage: stage})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	var cardValue int64 = -1
	if v := report.Cards.Actual.Value; v != nil {
		cardValue = int64(*v)
	}
	var rankedValue int64 = -1
	if v := list.Groups[0].Entries[0].Figures.Actual; v != nil {
		rankedValue = *v
	}
	return cardValue, rankedValue
}

func activityWithoutGoalsScope() measure.Scope {
	sc := oneActivityScope()
	sc.Nodes[0].INQ, sc.Nodes[0].MQL, sc.Nodes[0].Revenue = nil, nil, nil
	return sc
}

func TestFunnelCards_ConversionWithoutAnActivityThatProjectsTheStageBefore_FR017_SC002(t *testing.T) {
	t.Parallel()
	facts := append(julyAndAugustFacts(revenue.StageINQ, 40, 40), julyAndAugustFacts(revenue.StageMQL, 4, 6)...)
	sc := oneActivityScope()
	sc.Nodes[0].INQ = nil
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel(), SetLaterStagesMyself: true}}
	s := newFixtureAt(midAugust, sc, goals, facts)
	f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}
	report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageMQL)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	list, err := s.RankedFunnel(t.Context(), priya, f,
		revenue.RankedQuery{Sort: revenue.SortActual, Order: revenue.OrderDesc, Size: 10, Page: 1, Stage: revenue.StageMQL})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	row := list.Groups[0].Entries[0].Figures.Conversion
	card := report.Cards.Conversion.Value
	const want = 12.5
	if row == nil || card == nil || *row != want || *card != want {
		t.Errorf("conversion card = %v, ranked row = %v, want both %v", deref(card), deref(row), want)
	}
}

func deref(p *float64) any {
	if p == nil {
		return nil
	}
	return *p
}

func TestFunnelCards_ConversionRoundsHalfUpLikeEveryReport_FR017(t *testing.T) {
	t.Parallel()
	facts := append(julyAndAugustFacts(revenue.StageINQ, 40, 40), julyAndAugustFacts(revenue.StageMQL, 11, 12)...)
	s := newFixtureAt(midAugust, oneActivityScope(), fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}, facts)
	f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}
	report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageMQL)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	list, err := s.RankedFunnel(t.Context(), priya, f,
		revenue.RankedQuery{Sort: revenue.SortActual, Order: revenue.OrderDesc, Size: 10, Page: 1, Stage: revenue.StageMQL})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	card, row := report.Cards.Conversion.Value, list.Groups[0].Entries[0].Figures.Conversion
	if card == nil || row == nil || *card != 28.8 || *row != 28.8 {
		t.Errorf("conversion card = %v, ranked row = %v; want both 23/80 = 28.75 rounded half up to 28.8", deref(card), deref(row))
	}
}
