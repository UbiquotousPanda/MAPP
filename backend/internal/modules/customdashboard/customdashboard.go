// Package customdashboard is the published contract of the customdashboard module: the types, ports and
// constructors that cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package customdashboard

import (
	"mapp/internal/modules/customdashboard/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Dashboard     = core.Dashboard
	Directory     = core.Directory
	Filter        = core.Filter
	Filters       = core.Filters
	GroupBy       = core.GroupBy
	Handler       = core.Handler
	Layout        = core.Layout
	Measure       = core.Measure
	PostgresStore = core.PostgresStore
	Query         = core.Query
	Ref           = core.Ref
	Service       = core.Service
	SharingInput  = core.SharingInput
	Sort          = core.Sort
	Store         = core.Store
	View          = core.View
	Widget        = core.Widget
)

func DatasetSources(widgets []Widget) []string {
	return core.DatasetSources(widgets)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, directory Directory) *Service {
	return core.NewService(tools, repo, directory)
}

func Validate(d Dashboard) error {
	return core.Validate(d)
}
