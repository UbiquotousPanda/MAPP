// Package auth is the published contract of the auth module: the types, ports and constructors that cross its
// boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package auth

import (
	"mapp/internal/modules/auth/internal/core"
	"mapp/internal/platform/database"
)

type (
	Directory     = core.Directory
	DemoPeople    = core.DemoPeople
	Handler       = core.Handler
	Options       = core.Options
	People        = core.People
	PostgresStore = core.PostgresStore
	Service       = core.Service
	Session       = core.Session
	Store         = core.Store
	Transactor    = core.Transactor
)

const (
	CookieName = core.CookieName
)

func NewHandler(s *Service, directory Directory) *Handler {
	return core.NewHandler(s, directory)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tx Transactor, repo Store, peopleRepo People, opts Options) *Service {
	return core.NewService(tx, repo, peopleRepo, opts)
}
