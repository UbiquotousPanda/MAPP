package activity

import (
	"context"

	"mapp/internal/campaign"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
)

// PlanningSummaries are Summaries without each activity's completeness and line items, for a campaign tree whose
// reader shows neither: working them out costs most of a year's read.
func (s *Service) PlanningSummaries(ctx context.Context, initiativeIDs []string) ([]campaign.ActivitySummary, error) {
	var summaries []campaign.ActivitySummary
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		list, err := s.repo.ListByInitiatives(ctx, initiativeIDs)
		if err != nil {
			return err
		}
		contexts := map[string]planContext{}
		summaries = make([]campaign.ActivitySummary, 0, len(list))
		for _, a := range list {
			pc, known := contexts[a.InitiativeID]
			if !known {
				if pc, known, err = s.contextOf(ctx, a.InitiativeID); err != nil {
					return err
				}
				if !known {
					continue
				}
				contexts[a.InitiativeID] = pc
			}
			goals := goalsOf(a, pc.model)
			summaries = append(summaries, campaign.ActivitySummary{
				ID: a.ID, InitiativeID: a.InitiativeID, Name: a.Name, TypeID: a.ActivityTypeID,
				PlannedCost: a.PlannedCost, Approved: a.Status == StatusApproved,
				StartDate: a.StartDate, EndDate: a.EndDate, Ongoing: a.Ongoing,
				INQ: goals.INQ, MQL: goals.MQL, Revenue: goals.Revenue, IncompleteLineItems: []errs.RecordRef{},
			})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return summaries, nil
}

// PlanningRows are ListForPlan's rows without completeness or unassigned planned cost, for the same reason.
func (s *Service) PlanningRows(ctx context.Context, a actor.Actor, planID string) ([]Summary, error) {
	return s.planRows(ctx, a, planID, s.planningDerived)
}

func (s *Service) planningDerived(ctx context.Context, all planActivities) (map[string]derived, error) {
	derivedOf := make(map[string]derived, len(all.activities))
	for _, activity := range all.activities {
		d, err := s.planningDerive(ctx, activity, all.contextOf(activity))
		if err != nil {
			return nil, err
		}
		derivedOf[activity.ID] = d
	}
	return derivedOf, nil
}

// planningDerive is the part of derive that needs neither the activity's line items nor its attributes checked.
func (s *Service) planningDerive(ctx context.Context, a Activity, pc planContext) (derived, error) {
	t, _, err := s.settings.ActivityType(ctx, a.ActivityTypeID)
	if err != nil {
		return derived{}, err
	}
	owner, err := s.personRef(ctx, a.OwnerID)
	if err != nil {
		return derived{}, err
	}
	return derived{
		displayStatus: displayStatus(a, date.Today(s.now())), owner: owner,
		activityType: TypeRef{ID: a.ActivityTypeID, Name: t.Name, Active: t.Active, Allowed: pc.model.Allows(a.ActivityTypeID)},
	}, nil
}
