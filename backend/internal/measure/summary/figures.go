package summary

const (
	percent      = 100
	onPlan       = 100
	tenthPercent = 1000
)

// performanceOf gives no per cent for a goal of zero or below, never "0 % above".
func performanceOf(actualOrProjected, goal int64) Performance {
	if goal <= 0 {
		return Performance{Variance: VarianceNoGoal}
	}
	whole := int(roundedRatio(actualOrProjected, goal, percent))
	return Performance{Percent: &whole, Variance: varianceOf(whole)}
}

func varianceOf(whole int) string {
	switch {
	case whole > onPlan:
		return VarianceAbovePlan
	case whole == onPlan:
		return VarianceOnPlan
	default:
		return VarianceBelowPlan
	}
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
