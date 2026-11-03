// Package summary serves the Summary report: revenue against goal, the funnel and the league tables (feature 048).
package summary

import (
	"time"

	"mapp/internal/platform/money"
)

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

const (
	StateNoGoals          = "noGoals"
	StateNoPerformance    = "noPerformanceData"
	StateNothingMatches   = "nothingMatches"
	PeriodActual          = "actual"
	PeriodInProgress      = "inProgress"
	PeriodProjected       = "projected"
	NotFilledIn           = "none"
	notFilledInLabel      = "Not filled in"
	uncategorisedCategory = "Uncategorised"
)

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

type Report struct {
	Revenue         RevenueSection `json:"revenue"`
	Funnel          FunnelSection  `json:"funnel"`
	Categories      []Choice       `json:"categories"`
	States          []string       `json:"states"`
	FinanceCovers   Covers         `json:"financeCovers"`
	PerformanceAsOf *time.Time     `json:"performanceAsOf"`
}

type RevenueSection struct {
	PeriodLabel       string       `json:"periodLabel"`
	ActualOrProjected *money.Money `json:"actualOrProjected"`
	Goal              *money.Money `json:"goal"`
	Performance
	GoalCoverage []Coverage    `json:"goalCoverage"`
	Trend        []TrendPeriod `json:"trend"`
}

type Coverage struct {
	Stage   Stage `json:"stage"`
	Percent *int  `json:"percent"`
}

type TrendPeriod struct {
	Key       string       `json:"key"`
	Label     string       `json:"label"`
	State     string       `json:"state"`
	Actual    *money.Money `json:"actual"`
	Projected *money.Money `json:"projected"`
	Goal      *money.Money `json:"goal"`
}

type FunnelSection struct {
	Stages            []StageFigures  `json:"stages"`
	Conversions       []Conversion    `json:"conversions"`
	Trend             ConversionTrend `json:"trend"`
	PlansWithoutStage int             `json:"plansWithoutStage"`
}

// StageFigures holds money for revenue and a count for the other stages.
type StageFigures struct {
	Stage             Stage `json:"stage"`
	ActualOrProjected any   `json:"actualOrProjected"`
	Goal              any   `json:"goal"`
	Performance
}

type ConversionTrend struct {
	Stage   Stage        `json:"stage"`
	Periods []RatePeriod `json:"periods"`
}

type RatePeriod struct {
	Key   string  `json:"key"`
	Label string  `json:"label"`
	State string  `json:"state"`
	Rate  *string `json:"rate"`
	Goal  *string `json:"goal"`
}

type Choice struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Covers struct {
	Plans int `json:"plans"`
	Of    int `json:"of"`
}
