// Package settings is the published contract of the settings module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package settings

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/settings/internal/core"
	"mapp/internal/platform/database"
)

type (
	ActivityType       = core.ActivityType
	Attribute          = core.Attribute
	AttributeInput     = core.AttributeInput
	AttributeResult    = core.AttributeResult
	AttributeType      = core.AttributeType
	AttributeValues    = core.AttributeValues
	ClearedValue       = core.ClearedValue
	Currency           = core.Currency
	ExchangeRate       = core.ExchangeRate
	FieldHelpText      = core.FieldHelpText
	FinanceBudget      = core.FinanceBudget
	FinanceBudgetItem  = core.FinanceBudgetItem
	GSAPRateFile       = core.GSAPRateFile
	Handler            = core.Handler
	Level              = core.Level
	Lock               = core.Lock
	Marking            = core.Marking
	MissingField       = core.MissingField
	Model              = core.Model
	Option             = core.Option
	PostgresStore      = core.PostgresStore
	RateImport         = core.RateImport
	RateInfo           = core.RateInfo
	RateSource         = core.RateSource
	Reference          = core.Reference
	ReferenceSource    = core.ReferenceSource
	Service            = core.Service
	ShellAttributeView = core.ShellAttributeView
	SplitShare         = core.SplitShare
	Store              = core.Store
)

const (
	DefaultSection           = core.DefaultSection
	LevelActivity            = core.LevelActivity
	LevelCampaign            = core.LevelCampaign
	LevelInitiative          = core.LevelInitiative
	LevelLineItem            = core.LevelLineItem
	LevelPlan                = core.LevelPlan
	LevelPurchaseRequest     = core.LevelPurchaseRequest
	LevelPurchaseRequestLine = core.LevelPurchaseRequestLine
	MarkingNeededToPublish   = core.MarkingNeededToPublish
	MarkingNeededToSubmit    = core.MarkingNeededToSubmit
	MarkingOptional          = core.MarkingOptional
	MaxRateUploadBytes       = core.MaxRateUploadBytes
	RateGSAPImport           = core.RateGSAPImport
	RateManual               = core.RateManual
	RoleBusinessUnit         = core.RoleBusinessUnit
	RoleCompanyCode          = core.RoleCompanyCode
	RoleCostCentre           = core.RoleCostCentre
	RoleEmailGroup           = core.RoleEmailGroup
	RoleGLCode               = core.RoleGLCode
	RolePRRecipients         = core.RolePRRecipients
	RolePRType               = core.RolePRType
	RoleShortText            = core.RoleShortText
	RoleVendor               = core.RoleVendor
	RoleVendorCode           = core.RoleVendorCode
	RoleVendorEmail          = core.RoleVendorEmail
	TypeLongText             = core.TypeLongText
	TypeMultipleChoice       = core.TypeMultipleChoice
	TypeMultipleChoiceSplit  = core.TypeMultipleChoiceSplit
	TypeNumber               = core.TypeNumber
	TypeSingleChoice         = core.TypeSingleChoice
	TypeText                 = core.TypeText
	TypeYesNo                = core.TypeYesNo
)

var (
	Levels = core.Levels //nolint:gochecknoglobals // re-exports core.Levels, which nothing reassigns
)

func AttributeValuesOf(column []byte) (AttributeValues, error) {
	return core.AttributeValuesOf(column)
}

func Diff(before, after any) ([]history.Change, error) {
	return core.Diff(before, after)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store) *Service {
	return core.NewService(tools, repo)
}

func Visible(a Attribute, businessUnit []string) bool {
	return core.Visible(a, businessUnit)
}
