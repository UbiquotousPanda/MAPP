package activity

import (
	"context"

	"mapp/internal/overspend"
	"mapp/internal/platform/memo"
)

// Overspend gives the budgets above an activity and what is left to plan in each (037 FR-014), and whether
// line items above the planned cost refuse or only warn.
type Overspend interface {
	Limits(ctx context.Context, path overspend.Path) ([]overspend.Limit, error)
	RefusesOverPlannedCost(ctx context.Context) (bool, error)
}

func (s *Service) UseOverspend(o Overspend) {
	s.overspend = o
}

// refusesOverPlannedCost is true when Settings › Overspend control refuses line items above the planned cost;
// under Warn (the default) submitting only warns of them. Read once per transaction.
func (s *Service) refusesOverPlannedCost(ctx context.Context) (bool, error) {
	if s.overspend == nil {
		return false, nil
	}
	return memo.Get(ctx, memo.Derived+":overspend:refusesOverPlannedCost", s.overspend.RefusesOverPlannedCost)
}

func (s *Service) overspendLimits(ctx context.Context, pc planContext) ([]overspend.Limit, error) {
	if s.overspend == nil {
		return []overspend.Limit{}, nil
	}
	return s.overspend.Limits(ctx, overspend.Path{PlanID: pc.plan.ID, CampaignID: pc.campaign.ID,
		InitiativeID: pc.initiative.ID, PlanCurrency: pc.plan.Normalised().Currency})
}
