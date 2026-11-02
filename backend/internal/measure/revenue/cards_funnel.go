package revenue

import (
	"math"

	"mapp/internal/projection"
)

// funnelCards sums the months before any grouping, as Revenue's cards do, counting the month in progress once.
func funnelCards(sums funnelMonthlySums, w window, anyGoal bool, previousActual *int64) FunnelCards {
	goal := sums.activityGoals
	var actual, total int64
	for i := range projection.Months {
		actual += sums.actual[i]
		total += sums.pastActual[i] + sums.projected[i]
	}
	cards := FunnelCards{}
	cards.Goal = intCard(goal, goal != 0 && anyGoal, ReasonNoGoal)
	cards.Actual = intCard(actual, todayMonthIndex(w.today, w.year) >= 0, ReasonNoData)
	cards.Projected = intCard(total, true, ReasonNoGoal)
	cards.Performance = ratioCard(total, goal, anyGoal)
	cards.Conversion = conversionCard(actual, previousActual)
	return cards
}

// actualToToday keeps the month in progress, which split.Actual leaves out so the total counts it once.
func actualToToday(split projection.Split) int64 {
	var total int64
	for _, m := range split.Months {
		if m.Actual != nil {
			total += *m.Actual
		}
	}
	return total
}

func intCard(value int64, present bool, reason string) NumberCard {
	if !present {
		return NumberCard{Reason: reason}
	}
	v := float64(value)
	return NumberCard{Value: &v}
}

func ratioCard(value, goal int64, anyGoal bool) NumberCard {
	if !anyGoal || goal == 0 {
		return NumberCard{Reason: ReasonNoGoal}
	}
	pct := math.Round(float64(value) / float64(goal) * 100)
	return NumberCard{Value: &pct}
}

// conversionCard mirrors 046's conversionOf: one decimal, "—" on a zero denominator.
func conversionCard(actual int64, previous *int64) NumberCard {
	if previous == nil || *previous == 0 {
		return NumberCard{Reason: ReasonNoPreviousStage}
	}
	rate := roundToOneDecimal(float64(actual) / float64(*previous) * 100)
	return NumberCard{Value: &rate}
}

func roundToOneDecimal(v float64) float64 {
	return float64(int64(v*10+0.5)) / 10
}
