package revenue

import (
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/money"
)

const (
	StatePast       = "actual"
	StateInProgress = "inProgress"
	StateFuture     = "planned"
)

const (
	ReasonNoGoal            = "noGoal"
	ReasonNotApproved       = "notApproved"
	ReasonNoSource          = "noSource"
	ReasonNoData            = "noData"
	ReasonNoPreviousStage   = "noPreviousStage"
	ReasonNoFinancialAccess = "noFinancialAccess"
	ReasonNoActualCost      = "noActualCost"
)

// Stamp names the model behind a projected figure and when its parameters last changed.
type Stamp struct {
	ModelName      string `json:"modelName"`
	ModelChangedAt string `json:"modelChangedAt"`
}

// MoneyCard is one card whose figure is money; Reason is set only when Value is nil.
type MoneyCard struct {
	Value  *money.Money `json:"value"`
	Reason string       `json:"reason"`
}

type NumberCard struct {
	Value  *float64 `json:"value"`
	Reason string   `json:"reason"`
}

// PerformanceCard carries its figure in words too, so the web never derives the word from the number.
type PerformanceCard struct {
	NumberCard
	Variance Variance `json:"variance"`
}

type RevenueCards struct {
	Goal        MoneyCard       `json:"goal"`
	Actual      MoneyCard       `json:"actual"`
	Projected   MoneyCard       `json:"projected"`
	Performance PerformanceCard `json:"performance"`
}

type RevenuePeriod struct {
	Key        string       `json:"key"`
	State      string       `json:"state"`
	Actual     *money.Money `json:"actual"`
	Projected  *money.Money `json:"projected"`
	Goal       *money.Money `json:"goal"`
	InProgress bool         `json:"inProgress"`
}

// RevenueTotals is the period table's Total row; a column with no figure in any period is nil.
type RevenueTotals struct {
	Goal      *money.Money `json:"goal"`
	Actual    *money.Money `json:"actual"`
	Projected *money.Money `json:"projected"`
}

type RevenueReport struct {
	Cards       RevenueCards    `json:"cards"`
	Period      string          `json:"period"`
	Periods     []RevenuePeriod `json:"periods"`
	Totals      RevenueTotals   `json:"totals"`
	Projection  *Stamp          `json:"projection"`
	Projections []Stamp         `json:"projections"`
	Reason      string          `json:"reason"`
}

// RevenueFigures is one entry's figures; AttributedRevenue, ActualCost and ROI come from 050, each with its reason.
type RevenueFigures struct {
	Goal                    *money.Money `json:"goal"`
	Actual                  *money.Money `json:"actual"`
	Projected               *money.Money `json:"projected"`
	Performance             *float64     `json:"performance"`
	Variance                Variance     `json:"variance"`
	AttributedRevenue       *money.Money `json:"attributedRevenue"`
	ActualCost              *money.Money `json:"actualCost"`
	ROI                     *float64     `json:"roi"`
	AttributedRevenueReason string       `json:"attributedRevenueReason"`
	Projection              *Stamp       `json:"projection,omitempty"`
	ActualCostReason        string       `json:"actualCostReason"`
	ROIReason               string       `json:"roiReason"`
}

// FunnelCards mirrors RevenueCards, plus the conversion from the previous stage.
type FunnelCards struct {
	Goal        NumberCard      `json:"goal"`
	Actual      NumberCard      `json:"actual"`
	Projected   NumberCard      `json:"projected"`
	Performance PerformanceCard `json:"performance"`
	Conversion  NumberCard      `json:"conversion"`
}

type FunnelPeriod struct {
	Key        string `json:"key"`
	State      string `json:"state"`
	Actual     *int64 `json:"actual"`
	Projected  *int64 `json:"projected"`
	Goal       *int64 `json:"goal"`
	InProgress bool   `json:"inProgress"`
}

type FunnelTotals struct {
	Goal      *int64 `json:"goal"`
	Actual    *int64 `json:"actual"`
	Projected *int64 `json:"projected"`
}

type FunnelReport struct {
	Stage           string         `json:"stage"`
	AvailableStages []string       `json:"availableStages"`
	UncoveredCount  int            `json:"uncoveredCount"`
	Cards           FunnelCards    `json:"cards"`
	Period          string         `json:"period"`
	Periods         []FunnelPeriod `json:"periods"`
	Totals          FunnelTotals   `json:"totals"`
	Projection      *Stamp         `json:"projection"`
	Projections     []Stamp        `json:"projections"`
	Reason          string         `json:"reason"`
}

type FunnelFigures struct {
	Goal        *int64   `json:"goal"`
	Actual      *int64   `json:"actual"`
	Projected   *int64   `json:"projected"`
	Performance *float64 `json:"performance"`
	Variance    Variance `json:"variance"`
	Conversion  *float64 `json:"conversion"`
	Projection  *Stamp   `json:"projection,omitempty"`
}

type (
	RevenueEntry = ranking.Entry[RevenueFigures]
	RevenueGroup = ranking.Group[RevenueFigures]
	FunnelEntry  = ranking.Entry[FunnelFigures]
	FunnelGroup  = ranking.Group[FunnelFigures]
	FunnelRanked = ranking.List[FunnelFigures]
	TrailStep    = ranking.TrailStep
)

// RevenueRanked is the ranked list with the model and cost basis its attributed revenue and ROI rest on.
type RevenueRanked struct {
	ranking.List[RevenueFigures]
	Attribution attribution.Stamp `json:"attribution"`
}
