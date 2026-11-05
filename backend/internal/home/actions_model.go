package home

import (
	"context"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

// The kinds of action item (contract HomeActionItem.kind), in the order the dialog lists them after the overdue ones.
const (
	ActionApproval        = "approval"
	ActionPurchaseRequest = "purchaseRequestToFix"
	ActionSwbsRequest     = "swbsRequest"
	ActionIncomplete      = "activityIncomplete"
)

const (
	recordActivity  = "activity"
	activityCreated = "created"
)

func actionRank(kind string) int {
	switch kind {
	case ActionApproval:
		return 0
	case ActionPurchaseRequest:
		return 1
	case ActionSwbsRequest:
		return 2
	}
	return 3
}

type ActionItem struct {
	Kind    string          `json:"kind"`
	Record  errs.RecordRef  `json:"record"`
	Plan    *errs.RecordRef `json:"plan"`
	Overdue bool            `json:"overdue"`
	Since   *time.Time      `json:"since"`
}

type ActionItemsPage struct {
	Items       []ActionItem `json:"items"`
	Total       int          `json:"total"`
	Show        bool         `json:"show"`
	HiddenUntil *date.Date   `json:"hiddenUntil"`
}

type ReminderView struct {
	HiddenUntil date.Date `json:"hiddenUntil"`
}

type Reminder struct {
	PersonID    string
	HiddenUntil date.Date
	UpdatedAt   time.Time
}

type ReminderStore interface {
	GetReminder(ctx context.Context, personID string) (Reminder, bool, error)
	PutReminder(ctx context.Context, r Reminder) error
}

type ActionsTransactor interface {
	Read(ctx context.Context, fn func(ctx context.Context) error) error
	Write(ctx context.Context, fn func(ctx context.Context) error) error
}

type actionRead func(ctx context.Context, a actor.Actor) ([]ActionItem, error)

// ActionSources are what the action items read from other areas; internal/app fills them (home_actions.go).
type ActionSources struct {
	ApprovalsWaiting        actionRead
	PurchaseRequestsToFix   actionRead
	LineItemsWaitingForSwbs actionRead
	Activities              func(ctx context.Context, a actor.Actor, ownerID string) ([]Activity, error)
}
