// Package allwork is the published contract of the allwork module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package allwork

import (
	"mapp/internal/modules/allwork/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	AttrValue         = core.AttrValue
	Attribute         = core.Attribute
	Choice            = core.Choice
	Choices           = core.Choices
	Currency          = core.Currency
	Expansion         = core.Expansion
	FilterValue       = core.FilterValue
	Filters           = core.Filters
	FinanceFacts      = core.FinanceFacts
	Handler           = core.Handler
	Labels            = core.Labels
	Level             = core.Level
	Location          = core.Location
	MonthAmount       = core.MonthAmount
	Months            = core.Months
	Node              = core.Node
	Option            = core.Option
	Owner             = core.Owner
	PlanMonth         = core.PlanMonth
	PostgresStore     = core.PostgresStore
	PreferencesRecord = core.PreferencesRecord
	Service           = core.Service
	Source            = core.Source
	Store             = core.Store
	StoredView        = core.StoredView
	Value             = core.Value
	ViewState         = core.ViewState
	YearData          = core.YearData
)

const (
	LevelActivity           = core.LevelActivity
	LevelCampaign           = core.LevelCampaign
	LevelInitiative         = core.LevelInitiative
	LevelLineItem           = core.LevelLineItem
	LevelPlan               = core.LevelPlan
	LevelUnassigned         = core.LevelUnassigned
	PeriodMonth             = core.PeriodMonth
	ShowEverything          = core.ShowEverything
	StrategicInclude        = core.StrategicInclude
	TypeMultipleChoice      = core.TypeMultipleChoice
	TypeMultipleChoiceSplit = core.TypeMultipleChoiceSplit
	TypeSingleChoice        = core.TypeSingleChoice
	TypeYesNo               = core.TypeYesNo
	ViewBudget              = core.ViewBudget
	ViewGrid                = core.ViewGrid
)

var (
	DefaultColumns = core.DefaultColumns //nolint:gochecknoglobals // re-exports core.DefaultColumns, which nothing reassigns
)

func ContentDisposition(name string) string {
	return core.ContentDisposition(name)
}

func LabelsOf(n *Node) Labels {
	return core.LabelsOf(n)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, src Source) *Service {
	return core.NewService(tools, repo, src)
}

func PlannedByActivity(nodes []Node, year int) map[string]Months {
	return core.PlannedByActivity(nodes, year)
}

func PlannedByActivityInYears(nodes []Node, from, to int) map[string]Months {
	return core.PlannedByActivityInYears(nodes, from, to)
}
