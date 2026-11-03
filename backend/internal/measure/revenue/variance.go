package revenue

import (
	"mapp/internal/platform/money"
	"mapp/internal/rollup"
)

type Variance string

const (
	AbovePlan Variance = "abovePlan"
	OnPlan    Variance = "onPlan"
	BelowPlan Variance = "belowPlan"
	NoGoal    Variance = "noGoal"
)

// Performance is (actual + projected) ÷ goal as a whole per cent, rounded half up exactly, for cents or counts alike;
// nil when the goal is not positive or the figure is negative.
func Performance(actualOrProjected, goal int64) *int {
	a, g := money.USD(money.FromCents(actualOrProjected)), money.USD(money.FromCents(goal))
	return rollup.BudgetUsedPercent(&a, &g)
}

func VarianceOf(performance *int) Variance {
	switch {
	case performance == nil:
		return NoGoal
	case *performance > 100:
		return AbovePlan
	case *performance == 100:
		return OnPlan
	}
	return BelowPlan
}
