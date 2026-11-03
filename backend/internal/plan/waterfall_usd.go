package plan

import "mapp/internal/settings"

// WaterfallUSD is the plan's goal at every stage, revenue in USD, as the plan page works it out: for a report that
// needs the goals of many plans without building each plan's view.
func WaterfallUSD(p Plan, m settings.Model) GoalFigures {
	return goalsOf(p, m, GoalTotals{}, usdConverter).Plan
}
