// Package overspend is the published contract of the overspend module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package overspend

import (
	"context"

	"mapp/internal/modules/history"
	"mapp/internal/modules/overspend/internal/core"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/database"
)

type (
	Budget        = core.Budget
	Budgets       = core.Budgets
	Configuration = core.Configuration
	Control       = core.Control
	GlobalBudget  = core.GlobalBudget
	Guard         = core.Guard
	Handler       = core.Handler
	Limit         = core.Limit
	Mode          = core.Mode
	Path          = core.Path
	PlanCost      = core.PlanCost
	PostgresStore = core.PostgresStore
	Service       = core.Service
	Store         = core.Store
	Transactor    = core.Transactor
)

const (
	KindCampaign   = core.KindCampaign
	KindInitiative = core.KindInitiative
	KindPlan       = core.KindPlan
	MsgChooseMode  = core.MsgChooseMode
	Warn           = core.Warn
)

func ControlOf(ctx context.Context, mode Mode, ownerID string, plan authz.PlanFacts) Control {
	return core.ControlOf(ctx, mode, ownerID, plan)
}

func DefaultConfiguration() Configuration {
	return core.DefaultConfiguration()
}

func Described(kinds []history.Kind) []history.Kind {
	return core.Described(kinds)
}

func NewGuard(tx Transactor, repo Budgets) *Guard {
	return core.NewGuard(tx, repo)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store) *Service {
	return core.NewService(tools, repo)
}

func ParseMode(text string) (Mode, bool) {
	return core.ParseMode(text)
}

func RequireChange(ctx context.Context, ownerID string, plan authz.PlanFacts) error {
	return core.RequireChange(ctx, ownerID, plan)
}

func Stored(m Mode) string {
	return core.Stored(m)
}
