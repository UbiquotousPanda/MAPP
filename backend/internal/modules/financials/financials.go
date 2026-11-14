// Package financials is the published contract of the financials module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package financials

import (
	"context"

	"mapp/internal/modules/financials/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
	"mapp/internal/platform/ids"
)

type (
	Access            = core.Access
	DemoLoad          = core.DemoLoad
	Deps              = core.Deps
	Displays          = core.Displays
	Facts             = core.Facts
	Fields            = core.Fields
	Handler           = core.Handler
	Import            = core.Import
	LinkedTransaction = core.LinkedTransaction
	Node              = core.Node
	Overview          = core.Overview
	Planning          = core.Planning
	PostgresStore     = core.PostgresStore
	Rates             = core.Rates
	RecordView        = core.RecordView
	Service           = core.Service
	SimulatedDelivery = core.SimulatedDelivery
	Store             = core.Store
	Totals            = core.Totals
	Transaction       = core.Transaction
	TransactionPage   = core.TransactionPage
	Type              = core.Type
	TypeCounts        = core.TypeCounts
)

const (
	LevelActivity     = core.LevelActivity
	LevelCampaign     = core.LevelCampaign
	LevelInitiative   = core.LevelInitiative
	LevelLineItem     = core.LevelLineItem
	LevelPlan         = core.LevelPlan
	TypeAccrual       = core.TypeAccrual
	TypeInvoice       = core.TypeInvoice
	TypePayment       = core.TypePayment
	TypePurchaseOrder = core.TypePurchaseOrder
)

func LoadDemo(ctx context.Context, repo Store, generator *ids.Generator, demo DemoLoad) (Import, error) {
	return core.LoadDemo(ctx, repo, generator, demo)
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
