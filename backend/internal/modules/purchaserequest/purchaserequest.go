// Package purchaserequest is the published contract of the purchaserequest module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package purchaserequest

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/purchaserequest/internal/core"
	"mapp/internal/platform/database"
)

type (
	ActivityLineItems = core.ActivityLineItems
	ApprovalHandler   = core.ApprovalHandler
	Claim             = core.Claim
	Configuration     = core.Configuration
	Deps              = core.Deps
	GSAP              = core.GSAP
	GSAPOrder         = core.GSAPOrder
	Handler           = core.Handler
	Line              = core.Line
	LineItemFacts     = core.LineItemFacts
	LineItemSearch    = core.LineItemSearch
	LineItems         = core.LineItems
	ListQuery         = core.ListQuery
	OrderLine         = core.OrderLine
	POLineRef         = core.POLineRef
	Page              = core.Page
	Person            = core.Person
	PlanFacts         = core.PlanFacts
	PostgresStore     = core.PostgresStore
	PurchaseRequest   = core.PurchaseRequest
	RoutedLine        = core.RoutedLine
	RoutedPR          = core.RoutedPR
	Routing           = core.Routing
	Service           = core.Service
	Status            = core.Status
	Store             = core.Store
	Summaries         = core.Summaries
	Summary           = core.Summary
	VendorGroup       = core.VendorGroup
	View              = core.View
	ViewScope         = core.ViewScope
	WorkflowFacts     = core.WorkflowFacts
)

const (
	SourceSimulatedGSAP      = core.SourceSimulatedGSAP
	StatusApproved           = core.StatusApproved
	StatusClosed             = core.StatusClosed
	StatusCreated            = core.StatusCreated
	StatusDeclined           = core.StatusDeclined
	StatusInReview           = core.StatusInReview
	StatusSubmitted          = core.StatusSubmitted
	WithModificationApproval = core.WithModificationApproval
)

func ClaimsOf(prs []PurchaseRequest, lineItemIDs []string) []Claim {
	return core.ClaimsOf(prs, lineItemIDs)
}

func DefaultConfiguration() Configuration {
	return core.DefaultConfiguration()
}

func HXKey(lineItemID string) string {
	return core.HXKey(lineItemID)
}

func NewApprovalHandler(s *Service) *ApprovalHandler {
	return core.NewApprovalHandler(s)
}

func NewHandler(s *Service) *Handler {
	return core.NewHandler(s)
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return core.NewPostgresStore(db)
}

func NewService(store Store, tools history.Tools, deps Deps) *Service {
	return core.NewService(store, tools, deps)
}
