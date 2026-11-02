package revenue

import (
	"mapp/internal/platform/money"
	"mapp/internal/projection"
	"mapp/internal/rollup"
)

// revenueTotals adds the twelve months before any grouping, so the cards are the same in month and
// quarter view; the month in progress counts once in the total, through Projected.
type revenueTotals struct {
	goal, actual, total money.Amount
}

func totalsOf(sums revenueMonthlySums) revenueTotals {
	t := revenueTotals{goal: sums.activityGoals}
	for i := range projection.Months {
		t.actual = t.actual.Add(sums.actual[i])
		t.total = t.total.Add(sums.pastActual[i]).Add(sums.projected[i])
	}
	return t
}

func revenueCards(sums revenueMonthlySums, w window, anyGoal bool, display money.Display) RevenueCards {
	t := totalsOf(sums)
	shown := func(a money.Amount) money.Amount { return display.Money(money.USD(a)).Amount }
	goal, total, currency := shown(t.goal), shown(t.total), display.Currency()
	cards := RevenueCards{Goal: moneyCardOf(goal, currency, anyGoal, ReasonNoGoal)}
	cards.Actual = moneyCardOf(shown(t.actual), currency, todayMonthIndex(w.today, w.year) >= 0, ReasonNoData)
	cards.Projected = moneyCardOf(total, currency, true, "")
	cards.Performance = performanceOf(total, goal, anyGoal)
	return cards
}

func moneyCardOf(amount money.Amount, currency string, has bool, reason string) MoneyCard {
	if !has {
		return MoneyCard{Reason: reason}
	}
	shown := money.Money{Amount: amount, Currency: currency}
	return MoneyCard{Value: &shown}
}

// performanceOf is (actual + projected) ÷ goal as a whole per cent, computed exactly on cents.
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
