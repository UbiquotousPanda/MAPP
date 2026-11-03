package revenue

import (
	"mapp/internal/platform/money"
)

// revenueCards add the twelve months before any grouping, so the cards are the same in month and quarter view.
func revenueCards(sums monthlySums, anyGoal bool, display money.Display) RevenueCards {
	goal, total, currency := shownIn(display, sums.activityGoals), shownIn(display, sums.total()), display.Currency()
	cards := RevenueCards{Goal: moneyCardOf(goal, currency, anyGoal, ReasonNoGoal)}
	cards.Projected = moneyCardOf(total, currency, true, "")
	cards.Performance = performanceOf(total, goal, anyGoal)
	return cards
}

func actualMoneyCard(series []ActivitySeries, display money.Display, sums monthlySums) MoneyCard {
	m := revenueMeasure()
	if !counted(series, m) {
		return MoneyCard{Reason: actualReason(series, m)}
	}
	return moneyCardOf(shownIn(display, sums.actualTotal()), display.Currency(), true, "")
}

func shownIn(display money.Display, c int64) money.Amount {
	return display.Money(money.USD(money.FromCents(c))).Amount
}

func moneyCardOf(amount money.Amount, currency string, has bool, reason string) MoneyCard {
	if !has {
		return MoneyCard{Reason: reason}
	}
	shown := money.Money{Amount: amount, Currency: currency}
	return MoneyCard{Value: &shown}
}

func performanceOf(actualOrProjected, goal money.Amount, anyGoal bool) NumberCard {
	if !anyGoal {
		return NumberCard{Reason: ReasonNoGoal}
	}
	return percentCard(Performance(actualOrProjected.Cents(), goal.Cents()))
}

func percentCard(pct *int) NumberCard {
	if pct == nil {
		return NumberCard{Reason: ReasonNoGoal}
	}
	value := float64(*pct)
	return NumberCard{Value: &value}
}
