// Package sample is the published contract of the sample module: the types, ports and constructors that cross
// its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package sample

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/sample/internal/core"
	"mapp/internal/platform/database"
)

type (
	Folder        = core.Folder
	Handler       = core.Handler
	Note          = core.Note
	PostgresStore = core.PostgresStore
	Service       = core.Service
	Store         = core.Store
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
