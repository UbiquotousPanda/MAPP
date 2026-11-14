package summary

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

func TestConversion_048_C7(t *testing.T) {
	t.Parallel()
	totals := map[Stage]Figures{
		StageINQ:     {Actual: 400, Goal: 500},
		StageMQL:     {Actual: 50, Goal: 50},
		StageRevenue: {Actual: 0, Goal: 0},
	}

	got := conversions([]Stage{StageINQ, StageMQL, StageRevenue}, totals, ptr[int64](100))

	want := []Conversion{
		{Stage: StageMQL, Rate: ptr("12.5"), Goal: ptr("10.0"), Variance: ptr(revenue.AbovePlan)},
		{Stage: StageRevenue, Rate: ptr("0.0"), Variance: ptr(revenue.NoGoal)},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("conversions() (-want +got)\n%s", diff)
	}
}

func TestConversion_ZeroPreviousStage_048_C7(t *testing.T) {
	t.Parallel()
	totals := map[Stage]Figures{StageINQ: {Actual: 0, Goal: 100}, StageMQL: {Actual: 7, Goal: 10}}

	got := conversions([]Stage{StageINQ, StageMQL}, totals, ptr[int64](100))

	if len(got) != 1 || got[0].Rate != nil || got[0].Goal == nil || *got[0].Goal != "10.0" {
		t.Errorf("conversions() = %+v, want a dash rate and the goal 10.0", got)
	}
}

func TestConversion_RoundsHalfAwayFromZero_048_C7(t *testing.T) {
	t.Parallel()
	tests := []struct {
		count, previous int64
		want            string
	}{
		{1, 8, "12.5"},
		{1, 3, "33.3"},
		{2, 3, "66.7"},
		{1, 16, "6.3"},
		{3, 2, "150.0"},
		{23, 80, "28.8"},
	}
	for _, tt := range tests {
		got := rateOf(tt.count, tt.previous)
		if got == nil || *got != tt.want {
			t.Errorf("rateOf(%d, %d) = %v, want %s", tt.count, tt.previous, got, tt.want)
		}
	}
}

func TestConversion_RefusesWhatEveryReportRefuses_048_C7(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct{ count, previous int64 }{{5, 0}, {-1, 5}} {
		if got := rateOf(tt.count, tt.previous); got != nil {
			t.Errorf("rateOf(%d, %d) = %s, want no rate, as projection.ConversionRate answers", tt.count, tt.previous, *got)
		}
	}
}

// A-3's model has no MQL, so its goals and its 11 MQL facts count nowhere for MQL: the strip's MQL figures are A-1's
// alone, its conversion is A-1's 11 MQL over both activities' 108 INQ, 10.2 %, each month's rate is A-1's MQL over
// both INQ, and MQL goal coverage leaves P-2 out on both sides, 20 of P-1's 40.
func TestStageStrip_LeavesOutActivitiesWhoseModelLacksTheStage_049_FR018_D426(t *testing.T) {
	t.Parallel()
	alone := newFakes()
	alone.series = []revenue.ActivitySeries{projected("A-1", planOne)}
	noMQL := projected("A-3", planTwo)
	noMQL.AllowedStages = []string{string(StageINQ), string(StageRevenue)}
	f := newFakes()
	f.series = []revenue.ActivitySeries{projected("A-1", planOne), noMQL}
	f.plans[planTwo] = revenue.Goal{INQ: ptr[int64](200), MQL: ptr[int64](100)}

	want := stageFiguresOf(report(t, alone, measure.Filter{}).Funnel, StageMQL)
	want.PlansWithout = 1
	got := report(t, f, measure.Filter{})

	if diff := cmp.Diff(want, stageFiguresOf(got.Funnel, StageMQL)); diff != "" {
		t.Errorf("MQL stage (-want +got)\n%s", diff)
	}
	if c := got.Funnel.Conversions; len(c) != 1 || deref(c[0].Rate) != "10.2" {
		t.Errorf("conversions = %d, rate %s, want one rate of 10.2", len(c), deref(c[0].Rate))
	}
	for _, p := range got.Funnel.Trend.Periods {
		want := map[string]string{PeriodActual: "10.0", PeriodProjected: "10.0"}[p.State]
		if want != "" && deref(p.Rate) != want {
			t.Errorf("trend %s rate = %s, want %s", p.Key, deref(p.Rate), want)
		}
	}
	if mql := got.Revenue.GoalCoverage[1]; mql.Percent == nil || *mql.Percent != 50 {
		t.Errorf("MQL goal coverage = %v, want 50", mql.Percent)
	}
}

func stageFiguresOf(f FunnelSection, stage Stage) StageFigures {
	for _, s := range f.Stages {
		if s.Stage == stage {
			return s
		}
	}
	return StageFigures{}
}
