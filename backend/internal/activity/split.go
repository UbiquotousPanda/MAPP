package activity

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/money"
	"mapp/internal/platform/record"
	"mapp/internal/settings"
)

// A split moves whole line items, keeping their IDs, and part of the planned cost to a new activity that
// remembers where it came from; goals stay on the original. No undo.

const (
	splitSuffix           = " (split)"
	msgSplitNothing       = "Choose line items or an amount to move."
	msgSplitTooMuch       = "Move at most %s, the activity's planned cost."
	msgSplitNoCost        = "This activity has no planned cost."
	msgSplitNotOfActivity = "%s is not a line item of this activity."
	msgSplitLineItemTwice = "Choose each line item once."
	splitVerb             = "split"
	splitIntoDetails      = "Into '%s' (%s): %s"
	splitFromDetails      = "Split from '%s' (%s)"
	splitRestartDetails   = "Approval restarted because the activity was split."
)

// Split is all or nothing. The new activity copies the original's type, owner, dates, ongoing, workflow,
// description, external name and Shell attributes, with no goals and status Created; the original goes back
// to Created when it was Submitted or Approved.
func (s *Service) Split(ctx context.Context, a actor.Actor, id string, in SplitRequest) (SplitResult, error) {
	var result SplitResult
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		p, err := s.planSplit(ctx, id, in)
		if err != nil {
			return err
		}
		if err = p.refusal(in.Version); err != nil {
			return err
		}
		created, err := s.createSplitOff(ctx, a, p)
		if err != nil {
			return err
		}
		after, err := s.lowerOriginal(ctx, a, p, created)
		if err != nil {
			return err
		}
		if result.Activity, err = s.viewOf(ctx, after, p.pc); err != nil {
			return err
		}
		result.NewActivity, err = s.viewOf(ctx, created, p.target)
		return err
	})
	if err != nil {
		return SplitResult{}, err
	}
	if result.Activity, err = s.shown(ctx, a, result.Activity); err != nil {
		return SplitResult{}, err
	}
	if result.NewActivity, err = s.shown(ctx, a, result.NewActivity); err != nil {
		return SplitResult{}, err
	}
	return result, nil
}

func (p *splitPlan) refusal(version *int) error {
	if version == nil || *version < 1 {
		p.problems.Add("version", reloadMessage)
	}
	if err := p.problems.Err(); err != nil {
		return err
	}
	return p.original.CheckVersion(*version, noun)
}

func (s *Service) createSplitOff(ctx context.Context, a actor.Actor, p splitPlan) (Activity, error) {
	created := newSplitActivity(p)
	var err error
	if created.ID, err = s.ids.Next(ctx, ids.PrefixActivity); err != nil {
		return Activity{}, err
	}
	created.Meta = record.NewMeta(a, s.now())
	if err = s.repo.Put(ctx, created); err != nil {
		return Activity{}, err
	}
	if _, err = s.history.Log(ctx, a, history.LogInput{
		Kind: kindName, RecordID: created.ID, RecordName: created.Name, Action: history.ActionCreated,
		Details: fmt.Sprintf(splitFromDetails, p.original.Name, p.original.ID),
	}); err != nil {
		return Activity{}, err
	}
	if len(p.moved) == 0 {
		return created, nil
	}
	movedIDs := make([]string, 0, len(p.moved))
	for _, li := range p.moved {
		movedIDs = append(movedIDs, li.ID)
	}
	if err = s.lineItems.MoveToActivity(ctx, a, movedIDs, created.ID); err != nil {
		return Activity{}, err
	}
	return created, nil
}

func (s *Service) lowerOriginal(ctx context.Context, a actor.Actor, p splitPlan, created Activity) (Activity, error) {
	before := p.original
	after := before
	if p.amount != nil && before.PlannedCost != nil {
		left := money.Money{Amount: before.PlannedCost.Amount.Sub(p.amount.Amount), Currency: before.PlannedCost.Currency}
		after.PlannedCost = &left
	}
	if p.restart {
		if err := after.MoveTo(StatusCreated); err != nil {
			return Activity{}, err
		}
	}
	after.Touch(a, s.now())
	if err := s.repo.Put(ctx, after); err != nil {
		return Activity{}, err
	}
	var changes []history.Change
	if !samePlannedCost(before.PlannedCost, after.PlannedCost) {
		changes = append(changes, history.Change{Field: fieldPlannedCost, Old: mustJSON(before.PlannedCost), New: mustJSON(after.PlannedCost)})
	}
	entry, err := s.history.Log(ctx, a, history.LogInput{
		Kind: kindName, RecordID: after.ID, RecordName: after.Name, Action: history.ActionChanged, Verb: splitVerb,
		Changes: changes, Details: fmt.Sprintf(splitIntoDetails, created.Name, created.ID, movedText(s, len(p.moved), p.amount)),
	})
	if err != nil {
		return Activity{}, err
	}
	if p.restart {
		if err = s.logRestart(ctx, a, restartLog{before: before, after: after, changes: entry.Changes, details: splitRestartDetails}); err != nil {
			return Activity{}, err
		}
	}
	return after, nil
}

func newSplitActivity(p splitPlan) Activity {
	o := p.original
	created := Activity{
		InitiativeID: p.target.initiative.ID, Name: p.name, ExternalName: o.ExternalName, ActivityTypeID: o.ActivityTypeID,
		OwnerID: o.OwnerID, StartDate: clonePtr(o.StartDate), EndDate: clonePtr(o.EndDate), Ongoing: o.Ongoing,
		ApprovalWorkflowID: o.ApprovalWorkflowID, Description: o.Description, Status: StatusCreated, SplitFromID: o.ID,
		Attributes: cloneValues(o.Attributes),
	}
	if p.amount != nil {
		moved := *p.amount
		created.PlannedCost = &moved
	}
	return created
}

// cloneValues shares nothing with the values it copies; never nil.
func cloneValues(values settings.AttributeValues) settings.AttributeValues {
	clone := settings.AttributeValues{}
	for id, v := range values {
		clone[id] = append(json.RawMessage{}, v...)
	}
	return clone
}

// movedText says what moved: "1 line item and 19,750.00 GBP", "2 line items", "5,000.00 GBP".
func movedText(s *Service, lineItems int, amount *money.Money) string {
	var parts []string
	if with := s.history.CountsText(map[string]int{lineItemKind: lineItems}); with != "" {
		parts = append(parts, strings.TrimPrefix(with, "with ")) // "with 1 line item" → "1 line item"
	}
	if amount != nil && !amount.Amount.IsZero() {
		parts = append(parts, amount.Format())
	}
	return strings.Join(parts, " and ")
}

func samePlannedCost(x, y *money.Money) bool {
	if x == nil || y == nil {
		return x == nil && y == nil
	}
	return *x == *y
}
