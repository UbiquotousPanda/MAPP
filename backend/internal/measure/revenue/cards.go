package revenue

import (
	"mapp/internal/platform/money"
)

// revenueCards add the twelve months before any grouping, so the cards are the same in month and quarter view.
func revenueCards(sums monthlySums, w window, anyGoal bool, display money.Display) RevenueCards {
	shown := func(c int64) money.Amount { return display.Money(money.USD(money.FromCents(c))).Amount }
	goal, total, currency := shown(sums.activityGoals), shown(sums.total()), display.Currency()
	cards := RevenueCards{Goal: moneyCardOf(goal, currency, anyGoal, ReasonNoGoal)}
	cards.Actual = moneyCardOf(shown(sums.actualTotal()), currency, todayMonthIndex(w.today, w.year) >= 0, ReasonNoData)
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
