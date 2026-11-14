// Package plan is the published contract of the plan module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package plan

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/plan/internal/core"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/database"
)

type (
	Allocation           = core.Allocation
	AttentionItem        = core.AttentionItem
	BudgetFromAllocation = core.BudgetFromAllocation
	CopyJob              = core.CopyJob
	Directory            = core.Directory
	Facts                = core.Facts
	GoalStage            = core.GoalStage
	Handler              = core.Handler
	Level                = core.Level
	ListFilter           = core.ListFilter
	Overview             = core.Overview
	Plan                 = core.Plan
	PlanList             = core.PlanList
	PlanSummary          = core.PlanSummary
	PlanType             = core.PlanType
	PlanView             = core.PlanView
	PostgresStore        = core.PostgresStore
	SearchMatch          = core.SearchMatch
	Service              = core.Service
	Settings             = core.Settings
	Status               = core.Status
	Store                = core.Store
)

const (
	LevelActivity   = core.LevelActivity
	LevelCampaign   = core.LevelCampaign
	LevelInitiative = core.LevelInitiative
	LevelLineItem   = core.LevelLineItem
	ScopeAll        = core.ScopeAll
	SpreadEvenly    = core.SpreadEvenly
	StageINQ        = core.StageINQ
	StageMQL        = core.StageMQL
	StageRevenue    = core.StageRevenue
	StatusDraft     = core.StatusDraft
	StatusPublished = core.StatusPublished
	TypeCrossMarket = core.TypeCrossMarket
	TypeOperational = core.TypeOperational
	TypeStrategic   = core.TypeStrategic
)

func AccessFacts(p Plan) authz.PlanFacts {
	return core.AccessFacts(p)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, settings Settings, directory Directory) *Service {
	return core.NewService(tools, repo, settings, directory)
}
