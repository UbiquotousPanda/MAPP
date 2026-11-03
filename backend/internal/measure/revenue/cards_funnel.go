package revenue

import "mapp/internal/projection"

// funnelCards sum the months before any grouping, as Revenue's cards do, counting the month in progress once.
func funnelCards(sums monthlySums, total int64, anyGoal bool, previousActual *int64) FunnelCards {
	goal, actual := sums.activityGoals, sums.actualTotal()
	cards := FunnelCards{}
	cards.Goal = intCard(goal, goal != 0 && anyGoal, ReasonNoGoal)
	cards.Projected = intCard(total, true, ReasonNoGoal)
	cards.Performance = ratioCard(total, goal, anyGoal)
	cards.Conversion = conversionCard(actual, previousActual)
	return cards
}

func intCard(value int64, present bool, reason string) NumberCard {
	if !present {
		return NumberCard{Reason: reason}
	}
	v := float64(value)
	return NumberCard{Value: &v}
}

func ratioCard(value, goal int64, anyGoal bool) NumberCard {
	if !anyGoal {
		return NumberCard{Reason: ReasonNoGoal}
	}
	return percentCard(Performance(value, goal))
}

func conversionCard(actual int64, previous *int64) NumberCard {
	if previous == nil {
		return NumberCard{Reason: ReasonNoPreviousStage}
	}
	rate, ok := projection.ConversionRate(actual, *previous)
	if !ok {
		return NumberCard{Reason: ReasonNoPreviousStage}
	}
	return NumberCard{Value: &rate}
}
