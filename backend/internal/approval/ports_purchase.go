package approval

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
)

// PurchaseRequests is the purchase-request side of approvals, called in the caller's transaction.
type PurchaseRequests interface {
	PurchaseRequest(ctx context.Context, id string) (PurchaseRequestFacts, bool, error)
	ListInScope(ctx context.Context, scope authz.Scope, ids []string) ([]PurchaseRequestFacts, error)
	ReadyCheck(ctx context.Context, a actor.Actor, id string, kind SubjectKind) (ReadyCheck, error)
	// RoundChanged sets the PR status for a round event; approvals writes the log entry.
	RoundChanged(ctx context.Context, a actor.Actor, id string, kind SubjectKind, outcome Outcome) (PurchaseRequestFacts, error)
}

type PurchaseRequestFacts struct {
	ID, Name, Status       string
	OwnerID, MoAApproverID string
	Amount                 *money.Money
	WorkflowID             string
	ModificationWorkflowID string
	Path                   []errs.RecordRef
	record.Meta
	Access      authz.PlanFacts
	Plan        PlanFacts
	Overages    []Overage
	Blocked     string // why it can't be submitted or approved now, "" when nothing stops it
	Submissions map[SubjectKind]string
}

const (
	SubmissionSubmit   = "submit"
	SubmissionResubmit = "resubmit"
)

const (
	StatusInReview = "inReview"
	StatusClosed   = "closed"
)

const (
	GroupPurchaseRequest     = "purchaseRequest"
	GroupPurchaseRequestLine = "purchaseRequestLine"
)

func (s *Service) UsePurchaseRequests(p PurchaseRequests) {
	s.purchases = p
}
