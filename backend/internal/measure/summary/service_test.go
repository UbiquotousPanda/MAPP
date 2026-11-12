package summary

import (
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

func report(t *testing.T, f *fakes, filter measure.Filter) Report {
	t.Helper()
	got, err := f.service().Report(t.Context(), actor.System, filter)
	if err != nil {
		t.Fatalf("Report() error = %v", err)
	}
	return got
}

func amounts() cmp.Option {
	return cmp.Comparer(func(a, b money.Amount) bool { return a.Cmp(b) == 0 })
}

func usd(cents int64) *money.Money {
	m := money.USD(money.FromCents(cents))
	return &m
}

func TestRevenueSection_048_FR005_C2(t *testing.T) {
	t.Parallel()

	got := report(t, newFakes(), measure.Filter{}).Revenue

	// A-1: 5 past months of 100.00, then June's and six more months' projections of 100.00; A-2's 200.00 counts too.
	want := RevenueSection{PeriodLabel: "FY 2026", ActualOrProjected: usd(140_000), Goal: usd(1_000_000),
		Performance:  Performance{Percent: ptr(14), Variance: revenue.BelowPlan},
		GoalCoverage: []Coverage{{StageINQ, ptr(50)}, {StageMQL, ptr(50)}, {StageRevenue, ptr(50)}}}
	if diff := cmp.Diff(want, got, amounts(), cmp.FilterPath(func(p cmp.Path) bool { return p.Last().String() == ".Trend" || p.Last().String() == ".TrendTotals" }, cmp.Ignore())); diff != "" {
		t.Errorf("revenue section (-want +got)\n%s", diff)
	}
}

func TestRevenueTrend_SplitAtToday_048_FR007(t *testing.T) {
	t.Parallel()

	months := report(t, newFakes(), measure.Filter{}).Revenue.Trend
	quarters := report(t, newFakes(), measure.Filter{Period: measure.PeriodQuarter}).Revenue.Trend

	wantJune := TrendPeriod{Key: "2026-06", Label: "Jun 2026", State: PeriodInProgress, Actual: usd(5_000),
		Projected: usd(10_000), Goal: usd(80_000)}
	if len(months) != monthsInAll || !cmp.Equal(wantJune, months[pastMonths], amounts()) {
		t.Errorf("June = %+v of %d months, want %+v of 12", months[pastMonths], len(months), wantJune)
	}
	if months[0].State != PeriodActual || months[0].Projected != nil || months[11].Actual != nil {
		t.Errorf("January %+v and December %+v, want an actual past and a projected future", months[0], months[11])
	}
	wantQ2 := TrendPeriod{Key: "2026-Q2", Label: "Q2 2026", State: PeriodInProgress, Actual: usd(25_000),
		Projected: usd(10_000), Goal: usd(240_000)}
	if len(quarters) != 4 || !cmp.Equal(wantQ2, quarters[1], amounts()) {
		t.Errorf("Q2 = %+v of %d quarters, want %+v of 4", quarters[1], len(quarters), wantQ2)
	}
}

func TestFunnelSection_048_FR009_FR010(t *testing.T) {
	t.Parallel()

	got := report(t, newFakes(), measure.Filter{}).Funnel

	// INQ: 50 past + 10 in June + 60 ahead = 120 against 100; conversion so far 11 MQL of 54 INQ.
	wantINQ := StageFigures{Stage: StageINQ, ActualOrProjected: ptr[int64](120), Goal: ptr[int64](100),
		Performance: Performance{Percent: ptr(120), Variance: revenue.AbovePlan}}
	if !cmp.Equal(wantINQ, got.Stages[0]) || len(got.Stages) != 3 || got.Stages[2].Stage != StageRevenue {
		t.Errorf("stages = %+v, want INQ %+v, then MQL and Revenue", got.Stages, wantINQ)
	}
	wantConversions := []Conversion{{Stage: StageMQL, Rate: ptr("20.4"), Goal: ptr("20.0"), Variance: ptr(revenue.AbovePlan)}}
	if diff := cmp.Diff(wantConversions, got.Conversions); diff != "" {
		t.Errorf("conversions (-want +got)\n%s", diff)
	}
	if len(got.Trend.Periods) != monthsInAll || *got.Trend.Periods[0].Rate != "20.0" || got.Stages[0].PlansWithout != 0 {
		t.Errorf("trend = %+v, INQ leaves out %d plans", got.Trend.Periods, got.Stages[0].PlansWithout)
	}
}

func TestStates_048_FR018(t *testing.T) {
	t.Parallel()
	noGoal := unprojected("A-9", planOne)
	noActual := projected("A-8", planOne)
	for i := range noActual.Months {
		noActual.Months[i].INQ.Actual, noActual.Months[i].MQL.Actual, noActual.Months[i].RevenueUSD.Actual = nil, nil, nil
	}
	tests := []struct {
		name   string
		series []revenue.ActivitySeries
		want   []string
	}{
		{"nothing matches the filters", nil, []string{StateNothingMatches}},
		{"finance hidden on one plan", []revenue.ActivitySeries{projected("A-1", planOne), projected("A-3", "P-HIDDEN")},
			[]string{StateNoFinance}},
		{"activities without goals", []revenue.ActivitySeries{noGoal}, []string{StateNoGoals}},
		{"no performance data yet", []revenue.ActivitySeries{noActual}, []string{StateNoPerformance}},
		{"every figure there", []revenue.ActivitySeries{projected("A-1", planOne)}, []string{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := newFakes()
			f.scope.Choices.FinancePlans = []string{planOne, planTwo}
			f.series = tt.series
			if diff := cmp.Diff(tt.want, report(t, f, measure.Filter{}).States); diff != "" {
				t.Errorf("states (-want +got)\n%s", diff)
			}
		})
	}
}

func TestStates_NoPlansInScope_048_FR018(t *testing.T) {
	t.Parallel()
	f := newFakes()
	f.scope.Nodes, f.series = nil, nil

	if got := report(t, f, measure.Filter{}).States; !cmp.Equal(got, []string{StateNoPlans}) {
		t.Errorf("states = %q, want only %q", got, StateNoPlans)
	}
}

func TestReport_ReadsTheScopeOnce_048_FR020(t *testing.T) {
	t.Parallel()
	forReport, forLeague := newFakes(), withSegments()

	report(t, forReport, measure.Filter{})
	league(t, forLeague, TableRevenue, nil)

	if forReport.scopeReads != 1 || forLeague.scopeReads != 1 {
		t.Errorf("scope reads: report %d, league %d; want 1 each, the one ActivitySeriesIn makes",
			forReport.scopeReads, forLeague.scopeReads)
	}
}

func TestNoFinanceView_048_FR003(t *testing.T) {
	t.Parallel()
	onePlan := newFakes()
	onePlan.scope.Choices.FinancePlans = []string{planOne}
	none := newFakes()
	none.scope.Choices.SeesFinance = false

	if got := report(t, onePlan, measure.Filter{}).FinanceCovers; got != (Covers{Plans: 1, Of: 2}) {
		t.Errorf("finance on one plan covers %+v, want 1 of 2", got)
	}
	if got := report(t, none, measure.Filter{}).FinanceCovers; got != (Covers{Plans: 0, Of: 2}) {
		t.Errorf("no finance covers %+v, want 0 of 2", got)
	}
}

func TestCategory_048_C8(t *testing.T) {
	t.Parallel()
	f := newFakes()

	got := report(t, f, measure.Filter{Own: url.Values{"category": {Uncategorised}}})

	if f.asked != Uncategorised {
		t.Errorf("series read for category %q, want %q", f.asked, Uncategorised)
	}
	want := []Choice{{ID: "CAT-1", Name: "Events"}, {ID: Uncategorised, Name: "Uncategorised"}}
	if diff := cmp.Diff(want, got.Categories); diff != "" {
		t.Errorf("categories (-want +got)\n%s", diff)
	}
}

func TestReport_RefusesMalformedOwnParameters_048_FR004(t *testing.T) {
	t.Parallel()
	_, err := newFakes().service().Report(t.Context(), actor.System, measure.Filter{Own: url.Values{"stage": {"inq"}}})
	if err == nil {
		t.Error("Report() with stage=inq gave no error, want the problem")
	}
}

func TestRevenueTrend_NoGoalNoProjection_048_FR017(t *testing.T) {
	t.Parallel()
	f := newFakes()
	f.series = []revenue.ActivitySeries{unprojected("A-2", planTwo)}

	trend := report(t, f, measure.Filter{}).Revenue.Trend

	if len(trend) != monthsInAll || trend[0].Goal != nil || trend[11].Goal != nil {
		t.Errorf("trend = %d periods, goals %v and %v; want the year's twelve without a goal", len(trend), trend[0].Goal,
			trend[11].Goal)
	}
}

func TestFunnel_StagesTheModelsAllow_048_C7(t *testing.T) {
	t.Parallel()
	f := newFakes()
	mqlOnly := projected("A-3", planTwo)
	mqlOnly.AllowedStages = []string{string(StageMQL)}
	f.series = []revenue.ActivitySeries{projected("A-1", planOne), mqlOnly}
	onlyMQL := newFakes()
	onlyMQL.series = []revenue.ActivitySeries{mqlOnly}

	both := report(t, f, measure.Filter{}).Funnel
	mql := report(t, onlyMQL, measure.Filter{}).Funnel

	got := map[Stage]int{}
	for _, s := range both.Stages {
		got[s.Stage] = s.PlansWithout
	}
	// Plan two's model has no INQ, so INQ leaves that plan out and MQL leaves out none.
	if diff := cmp.Diff(map[Stage]int{StageINQ: 1, StageMQL: 0, StageRevenue: 0}, got); diff != "" {
		t.Errorf("plans each stage leaves out (-want +got)\n%s", diff)
	}
	if len(mql.Stages) != 2 || mql.Stages[0].Stage != StageMQL || len(mql.Conversions) != 0 {
		t.Errorf("a model that allows only MQL shows %+v with %d conversions, want MQL and Revenue and none",
			mql.Stages, len(mql.Conversions))
	}
}

func TestRevenueSection_FactInProgressWithoutProjection_048_C10(t *testing.T) {
	t.Parallel()
	f := newFakes()
	noModel := unprojected("A-5", planTwo)
	for i := range pastMonths {
		noModel.Months[i].State = revenue.StatePast
	}
	noModel.Months[pastMonths].State = revenue.StateInProgress
	noModel.Months[pastMonths].RevenueUSD.Actual = ptr(money.FromCents(5_000))
	f.series = []revenue.ActivitySeries{noModel}

	got := report(t, f, measure.Filter{}).Revenue.ActualOrProjected

	// January's 200.00 and June's 50.00 so far: nothing projects June, so its facts count, as in Revenue (#130).
	if !cmp.Equal(usd(25_000), got, amounts()) {
		t.Errorf("actual or projected = %v, want 250.00 with the month in progress's facts", got)
	}
}
