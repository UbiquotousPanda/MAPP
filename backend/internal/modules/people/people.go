// Package people is the published contract of the people module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package people

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/people/internal/core"
	"mapp/internal/platform/database"
)

type (
	CurrentUser    = core.CurrentUser
	AccessHooks    = core.AccessHooks
	Currency       = core.Currency
	CurrencySource = core.CurrencySource
	DemoPerson     = core.DemoPerson
	DisplayRate    = core.DisplayRate
	Handler        = core.Handler
	Membership     = core.Membership
	Person         = core.Person
	PersonRef      = core.PersonRef
	PersonUsage    = core.PersonUsage
	PlanSource     = core.PlanSource
	PlanUse        = core.PlanUse
	PostgresStore  = core.PostgresStore
	Preferences    = core.Preferences
	Service        = core.Service
	Store          = core.Store
	Team           = core.Team
	TeamInput      = core.TeamInput
	TeamRef        = core.TeamRef
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store) *Service {
	return core.NewService(tools, repo)
}
