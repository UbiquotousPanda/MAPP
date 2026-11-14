// Package lineitem is the published contract of the lineitem module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package lineitem

import (
	"context"

	"mapp/internal/modules/history"
	"mapp/internal/modules/lineitem/internal/core"
	"mapp/internal/platform/database"
	"mapp/internal/platform/money"
)

type (
	ActivityFacts    = core.ActivityFacts
	BudgetItem       = core.BudgetItem
	CopyPair         = core.CopyPair
	Deps             = core.Deps
	Details          = core.Details
	FinanceBudgets   = core.FinanceBudgets
	Handler          = core.Handler
	Importer         = core.Importer
	Incomplete       = core.Incomplete
	Input            = core.Input
	LineItem         = core.LineItem
	MonthAmount      = core.MonthAmount
	PostgresStore    = core.PostgresStore
	Service          = core.Service
	Spread           = core.Spread
	SpreadInput      = core.SpreadInput
	SpreadMethod     = core.SpreadMethod
	SpreadMonthInput = core.SpreadMonthInput
	Store            = core.Store
	Swbs             = core.Swbs
	SwbsCodeReceived = core.SwbsCodeReceived
	SwbsReceipt      = core.SwbsReceipt
	SwbsStatus       = core.SwbsStatus
	Update           = core.Update
	View             = core.View
)

const (
	SpreadCustom     = core.SpreadCustom
	SpreadEvenly     = core.SpreadEvenly
	SpreadFirstMonth = core.SpreadFirstMonth
	SpreadLastMonth  = core.SpreadLastMonth
	SwbsReadyToSend  = core.SwbsReadyToSend
	SwbsReceived     = core.SwbsReceived
)

func ActivityMonths(f ActivityFacts) (months []string, hasDates bool) {
	return core.ActivityMonths(f)
}

func ConvertMonths(months []MonthAmount, from, to money.Rate) []money.Amount {
	return core.ConvertMonths(months, from, to)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, deps Deps) *Service {
	return core.NewService(tools, repo, deps)
}

func PlannedCostUSD(li LineItem, rate money.Rate) money.Amount {
	return core.PlannedCostUSD(li, rate)
}

func ReceiveSwbsCodes(ctx context.Context, repo Store, receipt SwbsReceipt) error {
	return core.ReceiveSwbsCodes(ctx, repo, receipt)
}

func SpreadMonths(li LineItem, f ActivityFacts) (months []MonthAmount, spread bool) {
	return core.SpreadMonths(li, f)
}

func SwbsStatusOf(li LineItem, f ActivityFacts) SwbsStatus {
	return core.SwbsStatusOf(li, f)
}

func USDMonths(months []MonthAmount, rate money.Rate) []money.Amount {
	return core.USDMonths(months, rate)
}
