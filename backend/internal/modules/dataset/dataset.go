// Package dataset is the published contract of the dataset module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package dataset

import (
	"mapp/internal/modules/dataset/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Cell          = core.Cell
	Column        = core.Column
	DashboardRef  = core.DashboardRef
	Dataset       = core.Dataset
	Deps          = core.Deps
	Handler       = core.Handler
	Kind          = core.Kind
	PostgresStore = core.PostgresStore
	Preview       = core.Preview
	Row           = core.Row
	Service       = core.Service
	SharingInput  = core.SharingInput
	Store         = core.Store
	View          = core.View
)

const (
	KindDate           = core.KindDate
	KindMoney          = core.KindMoney
	KindNumber         = core.KindNumber
	KindText           = core.KindText
	MaxUploadBodyBytes = core.MaxUploadBodyBytes
)

func MinorCell(minor int64) Cell {
	return core.MinorCell(minor)
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

func TextCell(text string) Cell {
	return core.TextCell(text)
}
