package revenue

import (
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/money"
)

const (
	StatePast       = "actual"
	StateInProgress = "inProgress"
	StateFuture     = "planned"
)

const (
	ReasonNoGoal                   = "noGoal"
	ReasonNotApproved              = "notApproved"
	ReasonNoSource                 = "noSource"
	ReasonNoData                   = "noData"
	ReasonAttributionNotConfigured = "attributionNotConfigured"
	ReasonNoPreviousStage          = "noPreviousStage"
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

type RevenueCards struct {
	Goal        MoneyCard  `json:"goal"`
	Actual      MoneyCard  `json:"actual"`
	Projected   MoneyCard  `json:"projected"`
	Performance NumberCard `json:"performance"`
}

// RevenuePeriod is one period of the series, split at today.
type RevenuePeriod struct {
	Key        string       `json:"key"`
	State      string       `json:"state"`
	Actual     *money.Money `json:"actual"`
	Projected  *money.Money `json:"projected"`
	Goal       *money.Money `json:"goal"`
	InProgress bool         `json:"inProgress"`
}

type RevenueReport struct {
	Cards      RevenueCards    `json:"cards"`
	Period     string          `json:"period"`
	Periods    []RevenuePeriod `json:"periods"`
	Projection *Stamp          `json:"projection"`
	Reason     string          `json:"reason"`
}

// RevenueFigures is one entry's figures; ActualCost and ROI are absent until 050 lands.
type RevenueFigures struct {
	Goal             *money.Money `json:"goal"`
	Actual           *money.Money `json:"actual"`
	Projected        *money.Money `json:"projected"`
	Performance      *float64     `json:"performance"`
	ActualCost       *money.Money `json:"actualCost"`
	ROI              *float64     `json:"roi"`
	ActualCostReason string       `json:"actualCostReason"`
	ROIReason        string       `json:"roiReason"`
}

// FunnelCards mirrors RevenueCards, plus the conversion from the previous stage.
type FunnelCards struct {
	Goal        NumberCard `json:"goal"`
	Actual      NumberCard `json:"actual"`
	Projected   NumberCard `json:"projected"`
	Performance NumberCard `json:"performance"`
	Conversion  NumberCard `json:"conversion"`
}

type FunnelPeriod struct {
	Key        string `json:"key"`
	State      string `json:"state"`
	Actual     *int64 `json:"actual"`
	Projected  *int64 `json:"projected"`
	Goal       *int64 `json:"goal"`
	InProgress bool   `json:"inProgress"`
}

type FunnelReport struct {
	Stage           string         `json:"stage"`
	AvailableStages []string       `json:"availableStages"`
	UncoveredCount  int            `json:"uncoveredCount"`
	Cards           FunnelCards    `json:"cards"`
	Period          string         `json:"period"`
	Periods         []FunnelPeriod `json:"periods"`
	Projection      *Stamp         `json:"projection"`
	Reason          string         `json:"reason"`
}

type FunnelFigures struct {
	Goal        *int64   `json:"goal"`
	Actual      *int64   `json:"actual"`
	Projected   *int64   `json:"projected"`
	Performance *float64 `json:"performance"`
	Conversion  *float64 `json:"conversion"`
}

type (
	RevenueEntry  = ranking.Entry[RevenueFigures]
	RevenueGroup  = ranking.Group[RevenueFigures]
	RevenueRanked = ranking.List[RevenueFigures]
	FunnelEntry   = ranking.Entry[FunnelFigures]
	FunnelGroup   = ranking.Group[FunnelFigures]
	FunnelRanked  = ranking.List[FunnelFigures]
	TrailStep     = ranking.TrailStep
)
