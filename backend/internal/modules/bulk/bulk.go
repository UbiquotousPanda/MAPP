// Package bulk is the published contract of the bulk module: the types, ports and constructors that cross its
// boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package bulk

import (
	"mapp/internal/modules/bulk/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Action        = core.Action
	Below         = core.Below
	Consequences  = core.Consequences
	Field         = core.Field
	FieldOption   = core.FieldOption
	FieldValue    = core.FieldValue
	Handler       = core.Handler
	Kind          = core.Kind
	Level         = core.Level
	Planning      = core.Planning
	PostgresStore = core.PostgresStore
	Record        = core.Record
	Service       = core.Service
	SetField      = core.SetField
	Store         = core.Store
	Target        = core.Target
)

const (
	ActionCopy      = core.ActionCopy
	LevelActivity   = core.LevelActivity
	LevelCampaign   = core.LevelCampaign
	LevelInitiative = core.LevelInitiative
)

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, planning Planning) *Service {
	return core.NewService(tools, repo, planning)
}
