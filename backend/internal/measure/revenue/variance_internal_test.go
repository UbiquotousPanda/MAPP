package revenue

import (
	"testing"

	"mapp/internal/platform/money"
)

var varianceCases = []struct {
	name     string
	total    int64
	goal     int64
	anyGoal  bool
	wantWord Variance
}{
	{"exactly 100 %", 3_650_000, 3_650_000, true, OnPlan},
	{"over 100 %", 4_000_000, 3_650_000, true, AbovePlan},
	{"under 100 %", 3_000_000, 3_650_000, true, BelowPlan},
	{"no goal in view", 3_000_000, 0, false, NoGoal},
	{"a zero goal", 3_000_000, 0, true, NoGoal},
}

func sumsOf(total, goal int64) monthlySums {
	var sums monthlySums
	sums.actualOrProjected[0], sums.activityGoals = total, goal
	return sums
}

func TestRevenueCards_PerformanceSaysItsVariance_048C1_FR023(t *testing.T) {
	t.Parallel()
	for _, tt := range varianceCases {
		got := revenueCards(sumsOf(tt.total, tt.goal), tt.anyGoal, money.DisplayUSD).Performance
		if got.Variance != tt.wantWord {
			t.Errorf("%s: Revenue performance card %+v says %q, want %q", tt.name, got.NumberCard, got.Variance, tt.wantWord)
		}
	}
}

func TestFunnelCards_PerformanceSaysItsVariance_048C1_FR023(t *testing.T) {
	t.Parallel()
	for _, tt := range varianceCases {
		got := funnelCards(sumsOf(tt.total, tt.goal), tt.total, tt.anyGoal, nil).Performance
		if got.Variance != tt.wantWord {
			t.Errorf("%s: Funnel performance card %+v says %q, want %q", tt.name, got.NumberCard, got.Variance, tt.wantWord)
		}
	}
}

func TestRankedFigures_SayTheWordTheirPerformanceImplies_048C1_FR023(t *testing.T) {
	t.Parallel()
	for _, tt := range varianceCases {
		total, goal := tt.total, tt.goal
		var goalPtr *int64
		if tt.anyGoal {
			goalPtr = &goal
		}
		revenue := withPerformance(RevenueFigures{Goal: usdOf(goalPtr), Projected: usdOf(&total)}, money.DisplayUSD)
		if revenue.Variance != tt.wantWord {
			t.Errorf("%s: Revenue entry performance %v says %q, want %q", tt.name, revenue.Performance, revenue.Variance, tt.wantWord)
		}
		funnel := withFunnelDerived(FunnelFigures{Goal: goalPtr, Projected: &total}, 0)
		if funnel.Variance != tt.wantWord {
			t.Errorf("%s: Funnel entry performance %v says %q, want %q", tt.name, funnel.Performance, funnel.Variance, tt.wantWord)
		}
	}
}
