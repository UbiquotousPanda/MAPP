// Package access is the published contract of the access module: the types, ports and constructors that cross
// its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package access

import (
	"mapp/internal/modules/access/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Assignment    = core.Assignment
	Directory     = core.Directory
	Handler       = core.Handler
	Person        = core.Person
	PostgresStore = core.PostgresStore
	Role          = core.Role
	Rule          = core.Rule
	Rules         = core.Rules
	Service       = core.Service
	Store         = core.Store
	Target        = core.Target
	TargetFinder  = core.TargetFinder
)

const (
	InPlan           = core.InPlan
	Need             = core.Need
	Public           = core.Public
	RecordActivity   = core.RecordActivity
	RecordCampaign   = core.RecordCampaign
	RecordInitiative = core.RecordInitiative
	RecordLineItem   = core.RecordLineItem
	RecordPlan       = core.RecordPlan
	View             = core.View
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, directory Directory) *Service {
	return core.NewService(tools, repo, directory)
}

func RuleFor(operation string) (Rule, bool) {
	return core.RuleFor(operation)
}

func RulePatterns() []string {
	return core.RulePatterns()
}
