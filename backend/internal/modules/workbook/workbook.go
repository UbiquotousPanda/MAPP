// Package workbook is the published contract of the workbook module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package workbook

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/workbook/internal/core"
	"mapp/internal/platform/database"
)

type (
	Attribute     = core.Attribute
	Change        = core.Change
	Choices       = core.Choices
	Handler       = core.Handler
	Import        = core.Import
	Level         = core.Level
	NewRecord     = core.NewRecord
	Option        = core.Option
	Person        = core.Person
	Plan          = core.Plan
	Planning      = core.Planning
	PostgresStore = core.PostgresStore
	Problem       = core.Problem
	Service       = core.Service
	Store         = core.Store
	Stored        = core.Stored
	Values        = core.Values
	Writer        = core.Writer
)

const (
	LevelActivity   = core.LevelActivity
	LevelCampaign   = core.LevelCampaign
	LevelInitiative = core.LevelInitiative
	LevelLineItem   = core.LevelLineItem
	MaxUploadBytes  = core.MaxUploadBytes
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
