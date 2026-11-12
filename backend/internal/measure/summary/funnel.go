package summary

import (
	"strconv"

	"mapp/internal/measure/revenue"
	"mapp/internal/projection"
)

// conversions take the models' weighted rate as their goal (measure-metrics), in tenths of a per cent; only MQL has one.
func conversions(stages []Stage, totals map[Stage]Figures, goal *int64) []Conversion {
	out := make([]Conversion, 0, len(stages))
	for i := 1; i < len(stages); i++ {
		stage, previous := totals[stages[i]], totals[stages[i-1]]
		g := goal
		if stages[i] != StageMQL {
			g = nil
		}
		out = append(out, Conversion{
			Stage:    stages[i],
			Rate:     rateOf(stage.Actual, previous.Actual),
			Goal:     tenthsText(g),
			Variance: conversionVariance(stage.Actual, previous.Actual, g),
		})
	}
	return out
}

// conversionVariance says No goal only when the goal is missing, and nothing when only the rate is.
func conversionVariance(actual, previous int64, goal *int64) *revenue.Variance {
	word := revenue.NoGoal
	switch {
	case goal == nil:
		return &word
	case previous <= 0:
		return nil
	}
	word = performanceOf(roundedRatio(actual, previous, tenthPercent), *goal).Variance
	return &word
}

// conversionGoals weigh each model's INQ→MQL rate by its activities' INQ goals, for the year and per period, in
// tenths of a per cent; nil where no INQ goal weighs.
func (b builder) conversionGoals(series []revenue.ActivitySeries) (*int64, []*int64) {
	var num, den int64
	var periodNum, periodDen []int64
	for _, s := range series {
		if s.InqToMqlRate == nil || !allows(s, StageMQL) {
			continue
		}
		rate := s.InqToMqlRate.Hundredths()
		t := sumSeries([]revenue.ActivitySeries{s}, stagePick(StageINQ))
		num, den = num+t.goal*rate, den+t.goal
		for i, p := range periodsOf(t.months, b.quarterly) {
			if i == len(periodNum) {
				periodNum, periodDen = append(periodNum, 0), append(periodDen, 0)
			}
			periodNum[i], periodDen[i] = periodNum[i]+p.goal*rate, periodDen[i]+p.goal
		}
	}
	periods := make([]*int64, len(periodNum))
	for i := range periodNum {
		periods[i] = weighted(periodNum[i], periodDen[i])
	}
	return weighted(num, den), periods
}

func weighted(goalTimesRate, goal int64) *int64 {
	if goal <= 0 {
		return nil
	}
	tenths := roundedRatio(goalTimesRate, goal*10, 1)
	return &tenths
}

func tenthsText(tenths *int64) *string {
	if tenths == nil {
		return nil
	}
	text := strconv.FormatFloat(float64(*tenths)/10, 'f', 1, 64)
	return &text
}

func rateOf(count, previous int64) *string {
	rate, ok := projection.ConversionRate(count, previous)
	if !ok {
		return nil
	}
	text := strconv.FormatFloat(rate, 'f', 1, 64)
	return &text
}
