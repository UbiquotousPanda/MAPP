package summary

import "mapp/internal/measure/revenue"

const (
	percent      = 100
	tenthPercent = 1000
)

// performanceOf takes 049's rule and words, so Summary and Revenue never word one figure differently.
func performanceOf(actualOrProjected, goal int64) Performance {
	whole := revenue.Performance(actualOrProjected, goal)
	return Performance{Percent: whole, Variance: revenue.VarianceOf(whole)}
}

func goalCoverage(activities, plans int64) *int {
	if plans <= 0 {
		return nil
	}
	whole := int(roundedRatio(activities, plans, percent))
	return &whole
}

// roundedRatio is n × scale ÷ d rounded half away from zero, for n ≥ 0 and d > 0.
func roundedRatio(n, d, scale int64) int64 {
	return (2*n*scale + d) / (2 * d)
}
