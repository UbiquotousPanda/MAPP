package summary

import "testing"

func TestVarianceWord_048_C1(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name              string
		actualOrProjected int64
		goal              int64
		wantPercent       int
		wantWord          string
	}{
		{"99.5 % rounds to 100, on plan", 995, 1000, 100, VarianceOnPlan},
		{"exactly 100 %", 1000, 1000, 100, VarianceOnPlan},
		{"100.4 % rounds to 100, on plan", 1004, 1000, 100, VarianceOnPlan},
		{"100.5 % rounds to 101, above plan", 1005, 1000, 101, VarianceAbovePlan},
		{"99.4 % rounds to 99, below plan", 994, 1000, 99, VarianceBelowPlan},
		{"nothing yet against a goal", 0, 1000, 0, VarianceBelowPlan},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := performanceOf(tt.actualOrProjected, tt.goal)
			if got.Percent == nil || *got.Percent != tt.wantPercent || got.Variance != tt.wantWord {
				t.Errorf("performanceOf(%d, %d) = %v %q, want %d %q", tt.actualOrProjected, tt.goal,
					got.Percent, got.Variance, tt.wantPercent, tt.wantWord)
			}
		})
	}
}

func TestVarianceWord_NoGoal_048_C1(t *testing.T) {
	t.Parallel()
	for _, goal := range []int64{0, -5} {
		got := performanceOf(500, goal)
		if got.Percent != nil || got.Variance != VarianceNoGoal {
			t.Errorf("performanceOf(500, %d) = %v %q, want nil %q", goal, got.Percent, got.Variance, VarianceNoGoal)
		}
	}
}

func TestGoalCoverage_048_C2(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		activities int64
		plans      int64
		want       *int
	}{
		{"activities cover part of the plans' goal", 7_500, 10_000, ptr(75)},
		{"activities set more than the plans", 12_345, 10_000, ptr(123)},
		{"plans without a goal give no coverage", 5_000, 0, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := goalCoverage(tt.activities, tt.plans)
			if (got == nil) != (tt.want == nil) || (got != nil && *got != *tt.want) {
				t.Errorf("goalCoverage(%d, %d) = %v, want %v", tt.activities, tt.plans, got, tt.want)
			}
		})
	}
}

func ptr[T any](v T) *T { return &v }
