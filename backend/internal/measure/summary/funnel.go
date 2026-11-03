package summary

import (
	"strconv"

	"mapp/internal/measure/revenue"
	"mapp/internal/projection"
)

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

// conversionVariance compares the shown rate with the shown goal, so the word matches the two figures beside it; it
// says No goal only when the goal is missing, and nothing when only the rate is.
func conversionVariance(stage, previous Figures) *revenue.Variance {
	word := revenue.NoGoal
	switch {
	case previous.Goal <= 0:
		return &word
	case previous.Actual <= 0:
		return nil
	}
	rate := roundedRatio(stage.Actual, previous.Actual, tenthPercent)
	goal := roundedRatio(stage.Goal, previous.Goal, tenthPercent)
	word = performanceOf(rate, goal).Variance
	return &word
}

// rateOf is projection.ConversionRate, the one every report uses, written with its one decimal.
func rateOf(count, previous int64) *string {
	rate, ok := projection.ConversionRate(count, previous)
	if !ok {
		return nil
	}
	text := strconv.FormatFloat(rate, 'f', 1, 64)
	return &text
}
