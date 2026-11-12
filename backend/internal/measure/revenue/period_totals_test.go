package revenue_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

// inYearModel places every goal inside the plan year: no velocity carries a deal past December.
func inYearModel() fakeGoals {
	m := lubricantsModel()
	m.InqToMqlVelocityMonths, m.MqlToDealVelocityMonths = 0, 0
	return fakeGoals{"A-1": revenue.ActivityGoals{Model: m}}
}

func revenueIn(t *testing.T, s *revenue.Service, period string) revenue.RevenueReport {
	t.Helper()
	report, err := s.Report(t.Context(), priya, measure.Filter{Period: period, Show: measure.ShowActivity})
	if err != nil {
		t.Fatalf("Report(%s): %v", period, err)
	}
	return report
}

func columnCents(periods []revenue.RevenuePeriod, pick func(revenue.RevenuePeriod) *money.Money) int64 {
	var sum int64
	for _, p := range periods {
		sum += centsOf(pick(p))
	}
	return sum
}

func TestRevenuePeriodTotals_EachColumnAddsUpTheSameInMonthsAndQuarters_039_FR035(t *testing.T) {
	t.Parallel()
	s := newFixtureAt(midAugust, oneActivityScope(), inYearModel(), julyAndAugustFacts("revenue", 1_000_000, 500_000))
	for _, period := range bothPeriods {
		report := revenueIn(t, s, period)
		got := report.Totals
		columns := map[string]struct {
			total *money.Money
			pick  func(revenue.RevenuePeriod) *money.Money
		}{
			"Goal":      {got.Goal, func(p revenue.RevenuePeriod) *money.Money { return p.Goal }},
			"Actual":    {got.Actual, func(p revenue.RevenuePeriod) *money.Money { return p.Actual }},
			"Projected": {got.Projected, func(p revenue.RevenuePeriod) *money.Money { return p.Projected }},
		}
		for name, c := range columns {
			if want := columnCents(report.Periods, c.pick); c.total == nil || c.total.Amount.Cents() != want {
				t.Errorf("%s: %s total = %v, want its periods' sum %d cents", period, name, c.total, want)
			}
		}
		if centsOf(got.Actual) != 1_500_000 || centsOf(got.Actual) != centsOf(report.Cards.Actual.Value) {
			t.Errorf("%s: Actual total %v, card %v, want both 15,000.00: July and August each counted once",
				period, got.Actual, report.Cards.Actual.Value)
		}
	}
}

func TestRevenuePeriodTotals_GoalAndActualEqualTheirCardsInEUR_039_FR035(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	rate, _ := money.ParseRate("0.92")
	sc.Currency = allwork.Currency{Code: "EUR", Rate: rate}
	s := newFixtureAt(midAugust, sc, inYearModel(), julyAndAugustFacts("revenue", 1_000_001, 500_000))
	for _, period := range bothPeriods {
		report := revenueIn(t, s, period)
		got, cards := report.Totals, report.Cards
		if got.Goal == nil || got.Goal.Currency != "EUR" || got.Goal.Amount.Cmp(cards.Goal.Value.Amount) != 0 {
			t.Errorf("%s: Goal total %v, want the Revenue goal card %v", period, got.Goal, cards.Goal.Value)
		}
		if got.Actual == nil || got.Actual.Currency != "EUR" || got.Actual.Amount.Cmp(cards.Actual.Value.Amount) != 0 {
			t.Errorf("%s: Actual total %v, want the Actual revenue card %v", period, got.Actual, cards.Actual.Value)
		}
	}
}

// A model's velocity can carry part of the goal past December; the card keeps it, the table's months do not.
func TestRevenuePeriodTotals_GoalIsTheYearsMonthsWhenPartLandsAfterTheYear_039_FR035_049C16(t *testing.T) {
	t.Parallel()
	report := revenueIn(t, newFixtureWith(oneActivityScope(), fakeGoals{"A-1": revenue.ActivityGoals{
		Model: lubricantsModel()}}, nil), measure.PeriodMonth)
	months := columnCents(report.Periods, func(p revenue.RevenuePeriod) *money.Money { return p.Goal })
	if centsOf(report.Totals.Goal) != months || months >= centsOf(report.Cards.Goal.Value) {
		t.Errorf("Goal total %v, months %d, card %v; want the months' sum, below the card", report.Totals.Goal, months,
			report.Cards.Goal.Value)
	}
	if after := centsOf(report.Totals.GoalAfterYear); months+after != centsOf(report.Cards.Goal.Value) || after <= 0 {
		t.Errorf("goal after the year %v; want the card less the Total, so the two add up to the card", report.Totals.GoalAfterYear)
	}
}

func TestRevenuePeriodTotals_NoGoalAfterTheYearWhenEveryGoalLandsInIt_D414(t *testing.T) {
	t.Parallel()
	report := revenueIn(t, newFixtureWith(oneActivityScope(), inYearModel(), nil), measure.PeriodMonth)
	if report.Totals.GoalAfterYear != nil {
		t.Errorf("goal after the year = %v, want none when the whole goal lands inside the year", report.Totals.GoalAfterYear)
	}
}

func TestRevenuePeriodTotals_AColumnWithoutAFigureIsNull_039_FR035(t *testing.T) {
	t.Parallel()
	report := revenueIn(t, newFixtureWith(oneActivityScope(), inYearModel(), nil), measure.PeriodQuarter)
	if report.Totals.Actual != nil || report.Totals.Goal == nil || report.Totals.Projected == nil {
		t.Errorf("totals = %+v, want no Actual (nothing counted) beside a goal and a projection", report.Totals)
	}
	sheets, err := revenue.NewRevenueReport(newFixtureWith(oneActivityScope(), inYearModel(), nil)).
		Sheets(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Sheets: %v", err)
	}
	rows := sheets[1].Sheet.Rows
	if last := rows[len(rows)-1]; last[0] != sheet.Bold("Total") || last[2] != sheet.Text("—") {
		t.Errorf("export ends %v, want the Total line with — for Actual", last)
	}
}

func funnelColumns(periods []revenue.FunnelPeriod) revenue.FunnelTotals {
	var goal, actual, projected int64
	for _, p := range periods {
		goal, actual, projected = goal+derefOr(p.Goal), actual+derefOr(p.Actual), projected+derefOr(p.Projected)
	}
	return revenue.FunnelTotals{Goal: &goal, Actual: &actual, Projected: &projected}
}

func TestFunnelPeriodTotals_EachColumnAddsUpAndGoalIsTheCard_039_FR035(t *testing.T) {
	t.Parallel()
	s := newFixtureAt(midAugust, oneActivityScope(), inYearModel(), julyAndAugustFacts(revenue.StageINQ, 40, 20))
	byPeriod := map[string]revenue.FunnelTotals{}
	for _, period := range bothPeriods {
		report, err := s.FunnelReport(t.Context(), priya, measure.Filter{Period: period}, revenue.StageINQ)
		if err != nil {
			t.Fatalf("FunnelReport(%s): %v", period, err)
		}
		got, want := report.Totals, funnelColumns(report.Periods)
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("%s: totals against the columns' sums (-want +got)\n%s", period, diff)
		}
		assertSameFigure(t, period+" INQ goal", report.Cards.Goal.Value, float64(derefOr(got.Goal)))
		byPeriod[period] = got
	}
	if diff := cmp.Diff(byPeriod[measure.PeriodMonth], byPeriod[measure.PeriodQuarter]); diff != "" ||
		derefOr(byPeriod[measure.PeriodMonth].Actual) != 60 {
		t.Errorf("months against quarters (-months +quarters)\n%s; want the same, July and August's 60 counted once", diff)
	}
}

func TestFunnelPeriodTotals_NoCountedFactIsNull_039_FR035(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(oneActivityScope(), inYearModel(), nil)
	report, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, revenue.StageINQ)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if report.Totals.Actual != nil || report.Totals.Goal == nil {
		t.Errorf("totals = %+v, want Actual null with nothing counted and the goal present", report.Totals)
	}
}
