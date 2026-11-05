package home

import (
	"cmp"
	"context"
	"slices"
	"strings"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/clock"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

type ActionsService struct {
	tx        ActionsTransactor
	src       ActionSources
	reminders ReminderStore
	now       clock.Clock
}

func NewActionsService(tx ActionsTransactor, src ActionSources, reminders ReminderStore, now clock.Clock) *ActionsService {
	return &ActionsService{tx: tx, src: src, reminders: reminders, now: now}
}

// ActionItems lists a's pending actions, overdue first, and whether the dialog opens: only with something to
// do, and not before the day "Remind me later" hid it until.
func (s *ActionsService) ActionItems(ctx context.Context, a actor.Actor) (ActionItemsPage, error) {
	page := ActionItemsPage{Items: []ActionItem{}}
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		today := date.Today(s.now())
		items, err := s.items(ctx, a, today)
		if err != nil {
			return err
		}
		reminder, found, err := s.reminders.GetReminder(ctx, a.ID)
		if err != nil {
			return err
		}
		page.Items, page.Total = items, len(items)
		if found && today.Before(reminder.HiddenUntil) {
			hidden := reminder.HiddenUntil
			page.HiddenUntil = &hidden
		}
		page.Show = len(items) > 0 && page.HiddenUntil == nil
		return nil
	})
	if err != nil {
		return ActionItemsPage{}, err
	}
	return page, nil
}

// RemindLater hides a's dialog until tomorrow. It is a personal setting, not a business record, so nothing
// is logged (as All work's preferences, D-121).
func (s *ActionsService) RemindLater(ctx context.Context, a actor.Actor) (ReminderView, error) {
	at := s.now()
	r := Reminder{PersonID: a.ID, HiddenUntil: date.Today(at).AddDays(1), UpdatedAt: at}
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		return s.reminders.PutReminder(ctx, r)
	})
	if err != nil {
		return ReminderView{}, err
	}
	return ReminderView{HiddenUntil: r.HiddenUntil}, nil
}

func (s *ActionsService) items(ctx context.Context, a actor.Actor, today date.Date) ([]ActionItem, error) {
	groups := []struct {
		kind string
		read actionRead
	}{
		{ActionApproval, s.src.ApprovalsWaiting},
		{ActionPurchaseRequest, s.src.PurchaseRequestsToFix},
		{ActionSwbsRequest, s.src.LineItemsWaitingForSwbs},
	}
	items := []ActionItem{}
	for _, g := range groups {
		found, err := g.read(ctx, a)
		if err != nil {
			return nil, err
		}
		for _, item := range found {
			item.Kind = g.kind
			items = append(items, item)
		}
	}
	owned, err := s.src.Activities(ctx, a, a.ID)
	if err != nil {
		return nil, err
	}
	for _, act := range owned {
		if incomplete(act) {
			items = append(items, incompleteItem(act, today))
		}
	}
	slices.SortStableFunc(items, compareActions)
	return items, nil
}

// incomplete: not yet submitted, and still needing fields or line items fixed before it can be.
func incomplete(act Activity) bool {
	open := act.Status == activityCreated || act.Status == activityDeclined
	return open && (len(act.Missing) > 0 || act.LineItemsNeedingAttention > 0)
}

func incompleteItem(act Activity, today date.Date) ActionItem {
	plan := act.Plan
	return ActionItem{
		Kind: ActionIncomplete, Record: errs.RecordRef{Type: recordActivity, ID: act.ID, Name: act.Name}, Plan: &plan,
		Overdue: act.StartDate != nil && act.StartDate.Before(today), // it should have started already
	}
}

// compareActions puts overdue items first, then by kind, the longest waiting first, then by ID.
func compareActions(x, y ActionItem) int {
	return cmp.Or(compareOverdue(x, y), cmp.Compare(actionRank(x.Kind), actionRank(y.Kind)), compareSince(x, y),
		cmp.Compare(len(x.Record.ID), len(y.Record.ID)), strings.Compare(x.Record.ID, y.Record.ID))
}

func compareOverdue(x, y ActionItem) int {
	switch {
	case x.Overdue == y.Overdue:
		return 0
	case x.Overdue:
		return -1
	}
	return 1
}

func compareSince(x, y ActionItem) int {
	switch {
	case x.Since == nil && y.Since == nil:
		return 0
	case x.Since == nil:
		return 1
	case y.Since == nil:
		return -1
	}
	return x.Since.Compare(*y.Since)
}
