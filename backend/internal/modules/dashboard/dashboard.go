// Package dashboard is the published contract of the dashboard module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package dashboard

import (
	"time"

	"mapp/internal/modules/dashboard/internal/core"
)

type (
	Currencies = core.Currencies
	Currency   = core.Currency
	Deps       = core.Deps
	Handler    = core.Handler
	Service    = core.Service
	Transactor = core.Transactor
	View       = core.View
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewService(tx Transactor, deps Deps, now func() time.Time) *Service {
	return core.NewService(tx, deps, now)
}
