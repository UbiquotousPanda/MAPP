package summary

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/revenue"
)

func TestConversion_048_C7(t *testing.T) {
	t.Parallel()
	totals := map[Stage]Figures{
		StageINQ:     {Actual: 400, Goal: 500},
		StageMQL:     {Actual: 50, Goal: 50},
		StageRevenue: {Actual: 0, Goal: 0},
	}

	got := conversions([]Stage{StageINQ, StageMQL, StageRevenue}, totals)

	want := []Conversion{
		{Stage: StageMQL, Rate: ptr("12.5"), Goal: ptr("10.0"), Variance: ptr(revenue.AbovePlan)},
		{Stage: StageRevenue, Rate: ptr("0.0"), Goal: ptr("0.0"), Variance: ptr(revenue.NoGoal)},
	}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("conversions() (-want +got)\n%s", diff)
	}
}

func TestConversion_ZeroPreviousStage_048_C7(t *testing.T) {
	t.Parallel()
	totals := map[Stage]Figures{StageINQ: {Actual: 0, Goal: 100}, StageMQL: {Actual: 7, Goal: 10}}

	got := conversions([]Stage{StageINQ, StageMQL}, totals)

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
