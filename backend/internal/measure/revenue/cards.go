package revenue

import (
	"mapp/internal/platform/money"
	"mapp/internal/rollup"
)

// revenueSums excludes the in-progress month from pastActual, so the total counts it once, via Projected (FR-010).
type revenueSums struct {
	goal, actual, pastActual, projected money.Amount
	hasActual, hasProjected             bool
}

func sumRevenuePeriods(periods []RevenuePeriod) revenueSums {
	var s revenueSums
	for _, p := range periods {
		if p.Goal != nil {
			s.goal = s.goal.Add(p.Goal.Amount)
		}
		if p.Actual != nil {
			s.actual, s.hasActual = s.actual.Add(p.Actual.Amount), true
			if p.State == StatePast {
				s.pastActual = s.pastActual.Add(p.Actual.Amount)
			}
		}
		if p.Projected != nil {
			s.projected, s.hasProjected = s.projected.Add(p.Projected.Amount), true
		}
	}
	return s
}

// revenueCards builds the fixed card set from the period totals, in their display currency (FR-024); a
// card with nothing behind it shows its reason rather than a zero (FR-009).
func revenueCards(periods []RevenuePeriod, anyGoal bool, currency string) RevenueCards {
	s := sumRevenuePeriods(periods)
	cards := RevenueCards{Goal: moneyCardOf(s.goal, currency, anyGoal, ReasonNoGoal)}
	cards.Actual = moneyCardOf(s.actual, currency, s.hasActual, ReasonNoData)
	total := s.actual
	switch {
	case s.hasProjected:
		total = s.pastActual.Add(s.projected)
		cards.Projected = moneyCardOf(total, currency, true, "")
	case s.hasActual:
		cards.Projected = moneyCardOf(total, currency, true, "")
	default:
		cards.Projected = MoneyCard{Reason: ReasonNoGoal}
	}
	cards.Performance = performanceOf(total, s.goal, anyGoal)
	return cards
}

func moneyCardOf(amount money.Amount, currency string, has bool, reason string) MoneyCard {
	if !has {
		return MoneyCard{Reason: reason}
	}
	shown := money.Money{Amount: amount, Currency: currency}
	return MoneyCard{Value: &shown}
}

// performanceOf is (actual + projected) ÷ goal as a whole per cent, computed exactly on cents (049-C15, 049-C16).
func performanceOf(actualOrProjected, goal money.Amount, anyGoal bool) NumberCard {
	if !anyGoal {
		return NumberCard{Reason: ReasonNoGoal}
	}
	a, g := money.USD(actualOrProjected), money.USD(goal)
	pct := rollup.BudgetUsedPercent(&a, &g)
	if pct == nil {
		return NumberCard{Reason: ReasonNoGoal}
	}
	value := float64(*pct)
	return NumberCard{Value: &value}
}
