// Package campaign is the published contract of the campaign module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package campaign

import (
	"mapp/internal/modules/campaign/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	ActivityCopyCounts = core.ActivityCopyCounts
	ActivitySummary    = core.ActivitySummary
	ApprovalSummary    = core.ApprovalSummary
	Campaign           = core.Campaign
	CampaignCopy       = core.CampaignCopy
	CampaignInput      = core.CampaignInput
	CampaignMove       = core.CampaignMove
	CampaignUpdate     = core.CampaignUpdate
	CampaignView       = core.CampaignView
	CopyPair           = core.CopyPair
	Deps               = core.Deps
	Handler            = core.Handler
	Initiative         = core.Initiative
	InitiativeCopy     = core.InitiativeCopy
	InitiativeInput    = core.InitiativeInput
	InitiativeMove     = core.InitiativeMove
	InitiativeUpdate   = core.InitiativeUpdate
	InitiativeView     = core.InitiativeView
	NoActivities       = core.NoActivities
	PlanFacts          = core.PlanFacts
	PostgresStore      = core.PostgresStore
	RecordCompleteness = core.RecordCompleteness
	RecordProblems     = core.RecordProblems
	Service            = core.Service
	Store              = core.Store
)

const (
	PurposeCopy = core.PurposeCopy
	PurposeMove = core.PurposeMove
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
