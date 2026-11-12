package revenue_test

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

func TestPeriods_ShowNoActualWhereNothingIsCounted_FR009(t *testing.T) {
	t.Parallel()
	r, f := reportsOf(t, reasonsFixture("approved", everySource, nil))

	for _, p := range r.Periods {
		if p.Actual != nil {
			t.Errorf("revenue %s actual = %s, want null: nothing is counted, never 0.00", p.Key, p.Actual.Amount)
		}
	}
	for _, p := range f.Periods {
		if p.Actual != nil {
			t.Errorf("INQ %s actual = %d, want null: nothing is counted, never 0", p.Key, *p.Actual)
		}
	}
}

func TestPeriods_ShowARealZeroWhereTheCountedFactsSumToZero_FR009(t *testing.T) {
	t.Parallel()
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-02", FactCount: 1},
	}
	r, f := reportsOf(t, reasonsFixture("approved", everySource, facts))

	if february := r.Periods[1].Actual; february == nil || february.Amount.Cents() != 0 {
		t.Errorf("revenue February actual = %v, want 0.00: a fact was counted", february)
	}
	if february := f.Periods[1].Actual; february == nil || *february != 0 {
		t.Errorf("INQ February actual = %v, want 0: a fact was counted", february)
	}
}

func TestRankedFunnel_ACoveredActivityWithoutFactsShowsNoActual_FR009(t *testing.T) {
	t.Parallel()
	got, err := reasonsFixture("approved", everySource, nil).RankedFunnel(t.Context(), priya,
		measure.Filter{Show: "activity"}, revenue.RankedQuery{Stage: "inq", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}

	for _, e := range got.Groups[0].Entries {
		if e.Figures.Actual != nil || e.Figures.Conversion != nil {
			t.Errorf("%s actual %v, conversion %v, want both null: nothing is counted, never 0", e.ID,
				e.Figures.Actual, e.Figures.Conversion)
		}
	}
	if got.Groups[0].Totals.Actual != nil {
		t.Errorf("totals actual = %v, want null", got.Groups[0].Totals.Actual)
	}
}

func assertNoFigure[T any](t *testing.T, label string, figures [3]*T) {
	t.Helper()
	if figures[0] != nil || figures[1] != nil || figures[2] != nil {
		t.Errorf("%s = actual, projected, goal %v, want every figure null", label, figures)
	}
}

func TestReports_WithNoPlanInViewShowNoGridOfZeros_FR008_FR009(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(measure.Scope{Year: 2025}, fakeGoals{}, nil)
	r, f := reportsOf(t, s)

	if r.Reason != revenue.ReasonNoData || r.Cards.Projected.Value != nil || r.Cards.Projected.Reason != revenue.ReasonNoData {
		t.Errorf("revenue reason %q, projected card %+v, want noData and no value", r.Reason, r.Cards.Projected)
	}
	if f.Reason != revenue.ReasonNoData || f.Cards.Projected.Value != nil || f.Cards.Projected.Reason != revenue.ReasonNoData {
		t.Errorf("INQ reason %q, projected card %+v, want noData and no value", f.Reason, f.Cards.Projected)
	}
	for _, p := range r.Periods {
		assertNoFigure(t, "revenue "+p.Key, [3]*money.Money{p.Actual, p.Projected, p.Goal})
	}
	for _, p := range f.Periods {
		assertNoFigure(t, "INQ "+p.Key, [3]*int64{p.Actual, p.Projected, p.Goal})
	}
}

// January and March have facts; February, April to July and August, the month in progress, have none.
func TestPeriods_AMonthWithoutAFactHasNoActualBesideCountedMonths_FR009_D426(t *testing.T) {
	t.Parallel()
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-01", Currency: "USD", AmountMinor: 10_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-03", Currency: "USD", AmountMinor: 5_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-01", Counts: 4, FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-03", Counts: 2, FactCount: 1},
	}
	s := newFixtureAt(midAugust, oneActivityScope(), inYearModel(), facts)
	want := map[string][]bool{measure.PeriodMonth: {true, false, true, false, false, false, false, false},
		measure.PeriodQuarter: {true, false, false}}
	for _, period := range bothPeriods {
		f := measure.Filter{Period: period, Show: measure.ShowActivity}
		r := revenueIn(t, s, period)
		inq, err := s.FunnelReport(t.Context(), priya, f, revenue.StageINQ)
		if err != nil {
			t.Fatalf("FunnelReport: %v", err)
		}
		for i, has := range want[period] {
			if (r.Periods[i].Actual != nil) != has || (inq.Periods[i].Actual != nil) != has {
				t.Errorf("%s: revenue actual %v, INQ actual %v, want a figure %v", r.Periods[i].Key,
					r.Periods[i].Actual, inq.Periods[i].Actual, has)
			}
		}
		if centsOf(r.Totals.Actual) != 15_000 || derefOr(inq.Totals.Actual) != 6 {
			t.Errorf("%s: totals %v and %v, want the months with data, 150.00 and 6", period, r.Totals.Actual,
				inq.Totals.Actual)
		}
	}
}
