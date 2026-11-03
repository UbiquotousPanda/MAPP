package revenue_test

import (
	"testing"

	"mapp/internal/measure/revenue"
)

func TestPerformanceAndVariance_048C1_FR023(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name              string
		actualOrProjected int64
		goal              int64
		wantPerformance   string
		wantVariance      revenue.Variance
	}{
		{"99.4 % rounds down, below plan", 994, 1_000, "99", revenue.BelowPlan},
		{"99.5 % rounds half up to 100, on plan", 995, 1_000, "100", revenue.OnPlan},
		{"exactly 100 %, on plan", 3_650_000, 3_650_000, "100", revenue.OnPlan},
		{"100.4 % is 100 as a whole per cent, on plan", 1_004, 1_000, "100", revenue.OnPlan},
		{"100.5 % rounds up to 101, above plan", 1_005, 1_000, "101", revenue.AbovePlan},
		{"nothing yet against a goal, below plan", 0, 1_000, "0", revenue.BelowPlan},
		{"zero goal, no goal rather than 0 % above", 500, 0, "—", revenue.NoGoal},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			performance := revenue.Performance(tt.actualOrProjected, tt.goal)
			if got := shownInt(performance); got != tt.wantPerformance {
				t.Errorf("Performance(%d, %d) = %s, want %s", tt.actualOrProjected, tt.goal, got, tt.wantPerformance)
			}
			if got := revenue.VarianceOf(performance); got != tt.wantVariance {
				t.Errorf("VarianceOf(%s) = %q, want %q", shownInt(performance), got, tt.wantVariance)
			}
		})
	}
}

func TestVarianceOf_NoGoalWhenThereIsNoPerformance_048C1_FR023(t *testing.T) {
	t.Parallel()
	if got := revenue.VarianceOf(nil); got != revenue.NoGoal {
		t.Errorf("VarianceOf(nil) = %q, want %q: an absent goal is never 0 %% above", got, revenue.NoGoal)
	}
}

func shownInt(v *int) string {
	if v == nil {
		return "—"
	}
	i := int64(*v)
	return shown(&i)
}
