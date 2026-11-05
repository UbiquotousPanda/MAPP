package lineitem

import (
	"context"
	"fmt"
	"slices"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
)

const (
	ApprovalApproved    = "approved"
	ApprovalNotApproved = "notApproved"
)

const approvalDetails = "Round %d of activity %s"

// ApprovalChoice is what an approved round of an activity decides about its line items: Only lists the line
// items of a round for some of them (empty: the activity's own round, about all of them); HeldBack were unticked.
type ApprovalChoice struct {
	ActivityID string
	Only       []string
	HeldBack   []string
	Round      int
}

// IsApproved holds only while the line item's activity is approved, which includes In progress and Complete.
func IsApproved(li LineItem, activityStatus string) bool {
	return li.Approved && activityStatus == activityApproved
}

func ApprovalOf(li LineItem, activityStatus string) string {
	if IsApproved(li, activityStatus) {
		return ApprovalApproved
	}
	return ApprovalNotApproved
}

func approvalColumn(approved bool) string {
	if approved {
		return ApprovalApproved
	}
	return ApprovalNotApproved
}

func (c ApprovalChoice) decided(id string) (decides, approved bool) {
	if len(c.Only) > 0 && !slices.Contains(c.Only, id) {
		return false, false
	}
	return true, !slices.Contains(c.HeldBack, id)
}

// SetApproval stores the choice on the activity's line items inside the caller's Write, logging each change.
func (s *Service) SetApproval(ctx context.Context, a actor.Actor, choice ApprovalChoice) error {
	return s.tx.Write(ctx, func(ctx context.Context) error {
		items, err := s.repo.ListByActivity(ctx, choice.ActivityID)
		if err != nil {
			return err
		}
		for _, li := range items {
			decides, approved := choice.decided(li.ID)
			if !decides || li.Approved == approved {
				continue
			}
			li.Approved = approved
			if err := s.putApproval(ctx, a, li, choice); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) putApproval(ctx context.Context, a actor.Actor, li LineItem, choice ApprovalChoice) error {
	li.Touch(a, s.now())
	if err := s.repo.Put(ctx, li); err != nil {
		return err
	}
	verb := "approved"
	if !li.Approved {
		verb = "set to not approved"
	}
	_, err := s.history.Log(ctx, a, history.LogInput{
		Kind: lineItemKind, RecordID: li.ID, RecordName: li.Name, Action: history.ActionStatusChanged, Verb: verb,
		Details: fmt.Sprintf(approvalDetails, choice.Round, choice.ActivityID),
	})
	return err
}
