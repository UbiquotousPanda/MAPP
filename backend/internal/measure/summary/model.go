// Package summary serves the Summary report: revenue against goal, the funnel and the league tables (feature 048).
package summary

type Stage string

const (
	StageINQ     Stage = "inq"
	StageMQL     Stage = "mql"
	StageRevenue Stage = "revenue"
)

const (
	VarianceAbovePlan = "abovePlan"
	VarianceOnPlan    = "onPlan"
	VarianceBelowPlan = "belowPlan"
	VarianceNoGoal    = "noGoal"
)

const NotFilledIn = "none"

type Figures struct {
	Actual    int64
	Projected int64
	Goal      int64
}

type Performance struct {
	Percent  *int   `json:"performance"`
	Variance string `json:"variance"`
}

type Conversion struct {
	Stage    Stage   `json:"stage"`
	Rate     *string `json:"rate"`
	Goal     *string `json:"goal"`
	Variance string  `json:"variance"`
}
