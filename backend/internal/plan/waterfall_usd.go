package plan

import "mapp/internal/settings"

// WaterfallUSD is the plan page's goal at every stage, revenue in USD, without building the plan's view.
func WaterfallUSD(p Plan, m settings.Model) GoalFigures {
	return goalsOf(p, m, GoalTotals{}, usdConverter).Plan
}
