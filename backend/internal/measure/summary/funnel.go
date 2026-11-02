package summary

import "strconv"

func conversions(stages []Stage, totals map[Stage]Figures) []Conversion {
	out := make([]Conversion, 0, len(stages))
	for i := 1; i < len(stages); i++ {
		stage, previous := totals[stages[i]], totals[stages[i-1]]
		out = append(out, Conversion{
			Stage:    stages[i],
			Rate:     rateOf(stage.Actual, previous.Actual),
			Goal:     rateOf(stage.Goal, previous.Goal),
			Variance: conversionVariance(stage, previous),
		})
	}
	return out
}

// conversionVariance compares the shown rate with the shown goal, so the word matches the two figures beside it.
func conversionVariance(stage, previous Figures) string {
	if previous.Actual <= 0 || previous.Goal <= 0 {
		return VarianceNoGoal
	}
	rate := roundedRatio(stage.Actual, previous.Actual, tenthPercent)
	goal := roundedRatio(stage.Goal, previous.Goal, tenthPercent)
	return performanceOf(rate, goal).Variance
}

// rateOf is count ÷ previous as a per cent with one decimal, or nil on a zero denominator.
func rateOf(count, previous int64) *string {
	if previous <= 0 {
		return nil
	}
	tenths := roundedRatio(count, previous, tenthPercent)
	text := strconv.FormatInt(tenths/10, 10) + "." + strconv.FormatInt(tenths%10, 10)
	return &text
}
