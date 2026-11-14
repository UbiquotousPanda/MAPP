// Package spa is the published contract of the SP&A view (feature 013): the records and values that
// cross its boundary, the ports internal/app fills, and the two constructors the wiring calls. The
// module's own code sits under internal/, where the compiler keeps it out of reach (ADR-0022).
package spa

import "mapp/internal/modules/spa/internal/core"

type (
	Level           = core.Level
	Plan            = core.Plan
	Record          = core.Record
	MonthAmount     = core.MonthAmount
	Value           = core.Value
	Dimension       = core.Dimension
	Spend           = core.Spend
	PurchaseRequest = core.PurchaseRequest
	PurchaseLine    = core.PurchaseLine
)

type (
	Planning   = core.Planning
	Finance    = core.Finance
	Purchases  = core.Purchases
	Displays   = core.Displays
	Transactor = core.Transactor
	Deps       = core.Deps
)

type (
	Service = core.Service
	Handler = core.Handler
)

const (
	LevelPlan       = core.LevelPlan
	LevelCampaign   = core.LevelCampaign
	LevelInitiative = core.LevelInitiative
	LevelActivity   = core.LevelActivity
	LevelLineItem   = core.LevelLineItem
)

func NewService(tx Transactor, deps Deps) *Service {
	return core.NewService(tx, deps)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}
