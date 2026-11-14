// Package budget is the published contract of the budget module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package budget

import (
	"mapp/internal/modules/budget/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Access           = core.Access
	Allocation       = core.Allocation
	Deps             = core.Deps
	Figures          = core.Figures
	GlobalBudget     = core.GlobalBudget
	GlobalBudgetView = core.GlobalBudgetView
	Handler          = core.Handler
	PlanBudget       = core.PlanBudget
	PlanInfo         = core.PlanInfo
	PostgresStore    = core.PostgresStore
	Service          = core.Service
	Store            = core.Store
	Summary          = core.Summary
)

const (
	PrefixAllocation   = core.PrefixAllocation
	PrefixGlobalBudget = core.PrefixGlobalBudget
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, deps Deps) *Service {
	return core.NewService(tools, repo, deps)
}
