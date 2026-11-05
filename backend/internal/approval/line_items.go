package approval

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
)

// roundEvent is what happened to a round: it opened, was approved, declined or recalled.
type roundEvent struct {
	round Round
	event Outcome
}

const (
	kindLineItems          = "lineItems"
	approvedLineItemsField = "approvedLineItemIds"
	lineItemsLabel         = "Line items"
	lineItemType           = "lineItem"
	approvalNotApproved    = "notApproved"
)

// forLineItems reports a round sent for some line items of an approved activity (053): it never moves the
// activity's status.
func (r Round) forLineItems() bool {
	return len(r.LineItemIDs) > 0
}

func (sub subject) notApproved() []LineItemFact {
	var list []LineItemFact
	for _, li := range sub.LineItems {
		if !li.Approved {
			list = append(list, li)
		}
	}
	return list
}

func (sub subject) decided(round Round) []LineItemFact {
	if !round.forLineItems() {
		return sub.LineItems
	}
	var list []LineItemFact
	for _, li := range sub.LineItems {
		if slices.Contains(round.LineItemIDs, li.ID) {
			list = append(list, li)
		}
	}
	return list
}

func (sub subject) label() string {
	if len(sub.RoundLineItems) > 0 {
		return lineItemsLabel
	}
	return sub.Kind.Label()
}

func subjectText(sub subject) string {
	text := fmt.Sprintf("'%s' (%s)", sub.Name, sub.ID)
	if len(sub.RoundLineItems) > 0 {
		return fmt.Sprintf(lineItemsOfText, strings.Join(sub.RoundLineItems, ", "), text)
	}
	return text
}

func (sb submitting) lineItemIDs() []string {
	if sb.kind != kindLineItems {
		return nil
	}
	return lineItemIDs(sb.sub.notApproved())
}

func openedStatus(sb submitting) string {
	if sb.round.forLineItems() {
		return sb.before.Status
	}
	return StatusSubmitted
}

func lineItemsNote(round Round) string {
	if !round.forLineItems() {
		return ""
	}
	return " · " + fmt.Sprintf(lineItemsOfText, strings.Join(round.LineItemIDs, ", "), "the activity")
}

func sentLineItems(sub subject, kind string) []errs.RecordRef {
	refs := []errs.RecordRef{}
	if kind != kindLineItems {
		return refs
	}
	for _, li := range sub.notApproved() {
		refs = append(refs, errs.RecordRef{Type: lineItemType, ID: li.ID, Name: li.Name})
	}
	return refs
}

func lineItemIDs(list []LineItemFact) []string {
	ids := make([]string, 0, len(list))
	for _, li := range list {
		ids = append(ids, li.ID)
	}
	return ids
}

func roundLineItems(sub subject, open Round) []RoundLineItem {
	list := []RoundLineItem{}
	if sub.Kind != KindActivity {
		return list
	}
	for _, li := range sub.decided(open) {
		list = append(list, RoundLineItem{ID: li.ID, Name: li.Name, PlannedCost: li.PlannedCost,
			HeldBack: slices.Contains(open.HeldBack, li.ID)})
	}
	return list
}

// holdBack keeps on the round the line items an approval leaves unticked and returns them; ticking one the
// round no longer decides is refused. A decision that names none (nil) holds nothing back.
func (dg *deciding) holdBack() ([]string, error) {
	ticked := dg.ticked
	if dg.kind != ActionApproved || dg.sub.Kind != KindActivity || ticked == nil {
		return nil, nil
	}
	open := stillOpen(dg.sub.decided(dg.round), dg.round.HeldBack)
	if err := refuseStale(open, ticked); err != nil {
		return nil, err
	}
	var unticked []string
	for _, id := range open {
		if !slices.Contains(ticked, id) {
			unticked = append(unticked, id)
		}
	}
	dg.round.HeldBack = append(slices.Clone(dg.round.HeldBack), unticked...)
	return unticked, nil
}

func stillOpen(decided []LineItemFact, heldBack []string) []string {
	var open []string
	for _, li := range decided {
		if !slices.Contains(heldBack, li.ID) {
			open = append(open, li.ID)
		}
	}
	return open
}

func refuseStale(open, ticked []string) error {
	for _, id := range ticked {
		if !slices.Contains(open, id) {
			return errs.Validation(errs.FieldError{Field: approvedLineItemsField, Message: fmt.Sprintf(notDecidedMessage, id)})
		}
	}
	return nil
}

func heldBackNote(unticked []string) string {
	if len(unticked) == 0 {
		return ""
	}
	return fmt.Sprintf(heldBackDetails, strings.Join(unticked, ", "))
}

// roundMoved hands the record round's event; a round for line items leaves the activity's status as it is, and
// an approved round of an activity decides its line items.
func (s *Service) roundMoved(ctx context.Context, a actor.Actor, sub subject, ev roundEvent) (subject, error) {
	round, event := ev.round, ev.event
	updated := sub
	var err error
	if !round.forLineItems() {
		if updated, err = s.moved(ctx, a, sub, event); err != nil {
			return subject{}, err
		}
	}
	if sub.Kind != KindActivity || event != OutcomeApproved {
		return updated.inRound(round), nil
	}
	choice := LineItemChoice{Only: round.LineItemIDs, HeldBack: round.HeldBack, Round: round.Number}
	if err = s.activities.SetLineItemApproval(ctx, a, sub.ID, choice); err != nil {
		return subject{}, err
	}
	facts, err := s.activity(ctx, sub.ID)
	return activitySubject(facts).inRound(round), err
}

// endLineItemRound ends, as restarted, the round open for line items when the activity's approval restarts.
func (s *Service) endLineItemRound(ctx context.Context, a actor.Actor, rounds []Round, now time.Time) error {
	open, found := openRound(rounds)
	if !found {
		return nil
	}
	open.Outcome, open.EndedAt = OutcomeRestarted, &now
	open.Touch(a, now)
	if err := s.repo.PutRound(ctx, open); err != nil {
		return err
	}
	return s.addAction(ctx, open, Action{Action: ActionRestarted, Level: open.CurrentLevel, Actor: a, At: now})
}

// withApproval says which of the preview's line items are approved, changing the list it was given.
func withApproval(items []PreviewLineItem, facts ActivityFacts) []PreviewLineItem {
	for i := range items {
		items[i].Approval = approvalNotApproved
		approved := slices.ContainsFunc(facts.LineItems, func(li LineItemFact) bool { return li.ID == items[i].ID && li.Approved })
		if approved && facts.Status == StatusApproved {
			items[i].Approval = StatusApproved
		}
	}
	return items
}
