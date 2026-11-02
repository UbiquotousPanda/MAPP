package revenue_test

import (
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// oneActivityScope is one plan with one activity whose goal is 365,000 INQ across the whole of 2026 — the
// domain model's own worked example, extended with 047's velocities (SC-001).
func oneActivityScope() measure.Scope {
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	node := allwork.Node{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
		INQ: inqGoal(365_000), StartDate: &start, EndDate: &end}
	return measure.Scope{Year: 2026, Nodes: []allwork.Node{node}, Matched: allwork.Matched{Activities: []string{"A-1"}},
		Currency: allwork.Currency{Code: "USD"}}
}

func revenueReportFixture(t *testing.T) revenue.RevenueReport {
	t.Helper()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)
	got, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	return got
}

func TestReport_NamesTheModelAndSplitsAtToday_FR012_FR010_SC006(t *testing.T) {
	t.Parallel()
	got := revenueReportFixture(t)

	if got.Projection == nil || got.Projection.ModelName != "Lubricants 1.0" {
		t.Fatalf("stamp = %+v, want the model named so a reviewer can reproduce the figure", got.Projection)
	}
	if got.Projection.ModelChangedAt != "2026-01-02T09:00:00Z" {
		t.Errorf("modelChangedAt = %q, want the fixture's last change, so a reviewer knows the figure is current", got.Projection.ModelChangedAt)
	}
	if len(got.Periods) != 12 {
		t.Fatalf("periods = %d, want 12 months by default", len(got.Periods))
	}
	// The fixed clock sits in July 2026.
	july := got.Periods[6]
	if !july.InProgress {
		t.Errorf("July = %+v, want the month in progress under the fixed clock", july)
	}
}

func TestReport_MatchesTheHandCalculatedTable_SC001(t *testing.T) {
	t.Parallel()
	got := revenueReportFixture(t)

	if got.Cards.Goal.Value == nil {
		t.Fatalf("goal card = %+v, want a value: the activity has a goal", got.Cards.Goal)
	}
	// 273 deals x 10,000 USD = 2,730,000.00 USD, exactly as 047's own table proves.
	wantGoal := money.USD(money.FromCents(273_000_000))
	if got.Cards.Goal.Value.Amount.Cents() != wantGoal.Amount.Cents() {
		t.Errorf("goal = %s, want %s (273 deals x 10,000 USD, 047's own table)", got.Cards.Goal.Value.Amount, wantGoal.Amount)
	}
}

// A real defect: the cards always labelled their amount USD, and the ranked list was never converted at
// all. Both must show EUR, the frame's own display currency (FR-024).
func TestReport_ShowsAmountsInTheDisplayCurrencyNotAlwaysUSD_FR024(t *testing.T) {
	t.Parallel()
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	node := allwork.Node{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
		INQ: inqGoal(365_000), StartDate: &start, EndDate: &end}
	rate, err := money.ParseRate("0.5")
	if err != nil {
		t.Fatalf("ParseRate: %v", err)
	}
	sc := measure.Scope{Year: 2026, Nodes: []allwork.Node{node}, Matched: allwork.Matched{Activities: []string{"A-1"}},
		Currency: allwork.Currency{Code: "EUR", Rate: rate}}
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	report, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if report.Cards.Goal.Value == nil || report.Cards.Goal.Value.Currency != "EUR" {
		t.Fatalf("goal card = %+v, want its currency EUR, not USD", report.Cards.Goal.Value)
	}
	const wantCents = 273_000_000 / 2 // 273,000,000 USD cents converted at 0.5
	if report.Cards.Goal.Value.Amount.Cents() != wantCents {
		t.Errorf("goal = %s, want %d cents (273,000,000 USD cents at 0.5)", report.Cards.Goal.Value.Amount, wantCents)
	}

	ranked, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	entry := ranked.Groups[0].Entries[0]
	if entry.Figures.Goal == nil || entry.Figures.Goal.Currency != "EUR" {
		t.Fatalf("ranked entry goal = %+v, want its currency EUR", entry.Figures.Goal)
	}
	if entry.Figures.Goal.Amount.Cents() != report.Cards.Goal.Value.Amount.Cents() {
		t.Errorf("ranked entry goal = %s, want the same converted amount as the report's own card %s",
			entry.Figures.Goal.Amount, report.Cards.Goal.Value.Amount)
	}
}

func TestReport_ProjectsEachActivitySeparatelyThenSums_FR022_049C3(t *testing.T) {
	t.Parallel()
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	nodes := []allwork.Node{
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end},
		{Level: allwork.LevelActivity, ID: "A-2", PlanID: "P-1", Name: "Relaunch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end},
	}
	sc := measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Activities: []string{"A-1", "A-2"}},
		Currency: allwork.Currency{Code: "USD"}}
	goals := fakeGoals{
		"A-1": revenue.ActivityGoals{Model: lubricantsModel()},
		"A-2": revenue.ActivityGoals{Model: lubricantsModel()},
	}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	// Each activity projects to 2,730,000.00 USD on its own (SC-001); summing their projections must double it.
	wantGoal := money.USD(money.FromCents(546_000_000))
	if got.Cards.Goal.Value == nil || got.Cards.Goal.Value.Amount.Cents() != wantGoal.Amount.Cents() {
		t.Errorf("goal = %v, want %s (two activities projected separately, then summed)", got.Cards.Goal.Value, wantGoal.Amount)
	}
}

func TestReport_AFactInACurrencyWithNoRateIsExcludedNotZeroed_FR024(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 500_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-03", Currency: "EUR", AmountMinor: 900_000, FactCount: 1},
	}
	s := newFixtureWith(sc, goals, facts)

	got, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	// The fake Rates port carries no EUR rate, so 046-C7 says the EUR fact is excluded from the total: March
	// contributes nothing, while February's USD fact still counts.
	march := got.Periods[2]
	if march.Actual != nil && march.Actual.Amount.Cents() != 0 {
		t.Errorf("March actual = %v, want 0: an unconvertible fact is excluded from the total", march.Actual)
	}
	february := got.Periods[1]
	if february.Actual == nil || february.Actual.Amount.Cents() != 500_000 {
		t.Fatalf("February actual = %v, want the USD fact still counted", february.Actual)
	}
}

func TestReport_WithoutAnyGoalStatesTheReason_FR008_FR009(t *testing.T) {
	t.Parallel()
	sc := measure.Scope{Year: 2026, Currency: allwork.Currency{Code: "USD"}}
	s := newFixtureWith(sc, fakeGoals{}, nil)

	got, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if got.Reason != revenue.ReasonNoData {
		t.Errorf("reason = %q, want %q: no activities in view", got.Reason, revenue.ReasonNoData)
	}
}

func TestReport_AQuarterSumsItsThreeMonths_FR003(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-01", Currency: "USD", AmountMinor: 100_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 200_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-03", Currency: "USD", AmountMinor: 300_000, FactCount: 1},
	}
	s := newFixtureWith(sc, goals, facts)

	got, err := s.Report(t.Context(), priya, measure.Filter{Period: measure.PeriodQuarter})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if len(got.Periods) != 4 {
		t.Fatalf("periods = %d, want the year's 4 quarters", len(got.Periods))
	}
	q1 := got.Periods[0]
	if q1.Key != "2026-Q1" {
		t.Fatalf("Q1 key = %q, want 2026-Q1", q1.Key)
	}
	if q1.Actual == nil || q1.Actual.Amount.Cents() != 600_000 {
		t.Errorf("Q1 actual = %v, want 6,000.00 USD (100,000 + 200,000 + 300,000 cents)", q1.Actual)
	}
}

func TestReport_ActualIsCountedFactsByFactDate_FR021(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 500_000, FactCount: 1},
	}
	s := newFixtureWith(sc, goals, facts)

	got, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	february := got.Periods[1]
	if february.Actual == nil || february.Actual.Amount.Cents() != 500_000 {
		t.Fatalf("February actual = %v, want the 5,000.00 USD fact counted in its own month", february.Actual)
	}
	if got.Cards.Actual.Value == nil || got.Cards.Actual.Value.Amount.Cents() != 500_000 {
		t.Errorf("actual card = %v, want the one counted fact", got.Cards.Actual.Value)
	}
}

// A real defect: July (the fixed clock's month) carries both an Actual and a Projected figure, and the
// cards summed both into the total, double-counting it. A fact landing in July must move Actual, never the
// total: July's own Projected figure already stands for that month (FR-010).
func TestReport_TotalDoesNotCountTheMonthInProgressTwice_FR010(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	before := newFixtureWith(sc, goals, nil)
	beforeReport, err := before.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report (no July fact): %v", err)
	}

	facts := []revenue.FactTotal{{ActivityID: "A-1", Stage: "revenue", Month: "2026-07", Currency: "USD", AmountMinor: 5_000_000, FactCount: 1}}
	after := newFixtureWith(sc, goals, facts)
	afterReport, err := after.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report (with a July fact): %v", err)
	}

	if afterReport.Cards.Actual.Value == nil ||
		afterReport.Cards.Actual.Value.Amount.Cents()-beforeReport.Cards.Actual.Value.Amount.Cents() != 5_000_000 {
		t.Fatalf("actual card moved by %v, want exactly the 50,000.00 USD July fact", afterReport.Cards.Actual.Value)
	}
	if afterReport.Cards.Projected.Value.Amount.Cents() != beforeReport.Cards.Projected.Value.Amount.Cents() {
		t.Errorf("total = %s after a July fact, want it unchanged from %s: July's model figure already covers July",
			afterReport.Cards.Projected.Value.Amount, beforeReport.Cards.Projected.Value.Amount)
	}
}
