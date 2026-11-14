// Package approval is the published contract of the approval module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package approval

import (
	"mapp/internal/modules/approval/internal/core"
	"mapp/internal/modules/history"
	"mapp/internal/platform/database"
)

type (
	Access               = core.Access
	Action               = core.Action
	ActionAvailability   = core.ActionAvailability
	ActionKind           = core.ActionKind
	ActionSet            = core.ActionSet
	Activities           = core.Activities
	ActivityFacts        = core.ActivityFacts
	ChangeText           = core.ChangeText
	Choice               = core.Choice
	Condition            = core.Condition
	Counts               = core.Counts
	DecisionInput        = core.DecisionInput
	DeclineNote          = core.DeclineNote
	Delegation           = core.Delegation
	Excluded             = core.Excluded
	FactOption           = core.FactOption
	FactRef              = core.FactRef
	Grant                = core.Grant
	Handler              = core.Handler
	Level                = core.Level
	LevelView            = core.LevelView
	MissingFieldRef      = core.MissingFieldRef
	Notification         = core.Notification
	NotificationKind     = core.NotificationKind
	Outcome              = core.Outcome
	Overage              = core.Overage
	People               = core.People
	Permission           = core.Permission
	PersonView           = core.PersonView
	PlanFacts            = core.PlanFacts
	PostgresStore        = core.PostgresStore
	PreviewLineItem      = core.PreviewLineItem
	PurchaseRequestFacts = core.PurchaseRequestFacts
	PurchaseRequests     = core.PurchaseRequests
	ReadyCheck           = core.ReadyCheck
	RecallInput          = core.RecallInput
	RoleInfo             = core.RoleInfo
	RoleRef              = core.RoleRef
	Round                = core.Round
	RoundLevel           = core.RoundLevel
	RoundSummary         = core.RoundSummary
	RoundView            = core.RoundView
	RowPage              = core.RowPage
	RuleChoices          = core.RuleChoices
	RuleFacts            = core.RuleFacts
	Section              = core.Section
	Service              = core.Service
	Store                = core.Store
	SubjectDecision      = core.SubjectDecision
	SubjectKind          = core.SubjectKind
	Submission           = core.Submission
	SubmissionLevel      = core.SubmissionLevel
	SubmitInput          = core.SubmitInput
	SubmitProblem        = core.SubmitProblem
	Viewer               = core.Viewer
	Workflow             = core.Workflow
	WorkflowRef          = core.WorkflowRef
)

const (
	ActionApproved              = core.ActionApproved
	ActionDeclined              = core.ActionDeclined
	ActionResubmitted           = core.ActionResubmitted
	ActionSubmitted             = core.ActionSubmitted
	GroupActivity               = core.GroupActivity
	GroupLineItem               = core.GroupLineItem
	GroupPurchaseRequestLine    = core.GroupPurchaseRequestLine
	KindActivity                = core.KindActivity
	KindModifiedPurchaseRequest = core.KindModifiedPurchaseRequest
	KindPurchaseRequest         = core.KindPurchaseRequest
	ModeAll                     = core.ModeAll
	ModeAny                     = core.ModeAny
	NotifyApprovalNeeded        = core.NotifyApprovalNeeded
	NotifyApproved              = core.NotifyApproved
	NotifyDeclined              = core.NotifyDeclined
	NotifyLevelApproved         = core.NotifyLevelApproved
	OutcomeApproved             = core.OutcomeApproved
	OutcomeCancelled            = core.OutcomeCancelled
	OutcomeDeclined             = core.OutcomeDeclined
	OutcomeOpen                 = core.OutcomeOpen
	OutcomeRecalled             = core.OutcomeRecalled
	OutcomeRestarted            = core.OutcomeRestarted
	OutcomeSuperseded           = core.OutcomeSuperseded
	PermissionDecideOnBehalf    = core.PermissionDecideOnBehalf
	PermissionManageWorkflows   = core.PermissionManageWorkflows
	RecordFieldMoAApprover      = core.RecordFieldMoAApprover
	ResolutionDecide            = core.ResolutionDecide
	SourceManager               = core.SourceManager
	SourcePeople                = core.SourcePeople
	SourceRecordField           = core.SourceRecordField
	TabWaiting                  = core.TabWaiting
)

func AverageDecisionDays(decided, seconds int64) *string {
	return core.AverageDecisionDays(decided, seconds)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(tools history.Tools, repo Store, peopleRepo People, activities Activities) *Service {
	return core.NewService(tools, repo, peopleRepo, activities)
}
