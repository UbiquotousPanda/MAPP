package revenue

// funnelCards sum the months before any grouping, as Revenue's cards do, counting the month in progress once.
func funnelCards(sums monthlySums, w window, anyGoal bool, previousActual *int64) FunnelCards {
	goal, actual, total := sums.activityGoals, sums.actualTotal(), sums.total()
	cards := FunnelCards{}
	cards.Goal = intCard(goal, goal != 0 && anyGoal, ReasonNoGoal)
	cards.Actual = intCard(actual, todayMonthIndex(w.today, w.year) >= 0, ReasonNoData)
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
