// Package activity is the published contract of the activity module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package activity

import (
	"mapp/internal/modules/activity/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Activity           = core.Activity
	ApprovalHooks      = core.ApprovalHooks
	CopyInput          = core.CopyInput
	CopyPair           = core.CopyPair
	Deps               = core.Deps
	DisplayStatus      = core.DisplayStatus
	FormView           = core.FormView
	GoalsInput         = core.GoalsInput
	Handler            = core.Handler
	Importer           = core.Importer
	Input              = core.Input
	LineItemBrief      = core.LineItemBrief
	LineItemFacts      = core.LineItemFacts
	LineItemProblem    = core.LineItemProblem
	MoveInput          = core.MoveInput
	PostgresStore      = core.PostgresStore
	Service            = core.Service
	Status             = core.Status
	Store              = core.Store
	SubmitCheck        = core.SubmitCheck
	Update             = core.Update
	View               = core.View
	WorkflowFacts      = core.WorkflowFacts
	WorkflowLevelFacts = core.WorkflowLevelFacts
	Workflows          = core.Workflows
)

const (
	DisplayApproved     = core.DisplayApproved
	DisplayComplete     = core.DisplayComplete
	DisplayCreated      = core.DisplayCreated
	DisplayDeclined     = core.DisplayDeclined
	DisplayInProgress   = core.DisplayInProgress
	DisplaySubmitted    = core.DisplaySubmitted
	ProblemMissingField = core.ProblemMissingField
	StatusApproved      = core.StatusApproved
	StatusCreated       = core.StatusCreated
	StatusDeclined      = core.StatusDeclined
	StatusSubmitted     = core.StatusSubmitted
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

func SortInPlanOrder(list []Activity) {
	core.SortInPlanOrder(list)
}
