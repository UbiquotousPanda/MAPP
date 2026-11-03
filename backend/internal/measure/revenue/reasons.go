package revenue

import "slices"

func factsHeld(status string) bool {
	return slices.Contains([]string{"created", "submitted", "declined"}, status)
}

// actualReason says why nothing of the measure is counted in view, in the order a planner would fix it.
func actualReason(series []ActivitySeries, m measureOf) string {
	switch {
	case len(series) == 0:
		return ReasonNoData
	case !slices.ContainsFunc(series, func(a ActivitySeries) bool { return !a.FactsHeld }):
		return ReasonNotApproved
	case !slices.ContainsFunc(series, func(a ActivitySeries) bool { return slices.Contains(a.Sourced, m.key) }):
		return ReasonNoSource
	}
	return ReasonNoData
}

func counted(series []ActivitySeries, m measureOf) bool {
	return slices.ContainsFunc(series, func(a ActivitySeries) bool {
		return slices.ContainsFunc(a.Months, func(month Month) bool { return m.month(month).Actual != nil })
	})
}

// reportReason names what holds the whole report back; unapproved activities' goals and projections still count.
func reportReason(series []ActivitySeries, anyGoal bool) string {
	switch {
	case len(series) == 0:
		return ReasonNoData
	case !slices.ContainsFunc(series, func(a ActivitySeries) bool { return !a.FactsHeld }):
		return ReasonNotApproved
	case anyGoal:
		return ""
	}
	return ReasonNoGoal
}
