package app

import (
	"context"

	"mapp/internal/approval"
	"mapp/internal/lineitem"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

func (p *approvalsActivities) SetLineItemApproval(ctx context.Context, a actor.Actor, activityID string, choice approval.LineItemChoice) error {
	return p.approveLineItems(ctx, a, lineitem.ApprovalChoice{
		ActivityID: activityID, Only: choice.Only, HeldBack: choice.HeldBack, Round: choice.Round,
	})
}

func (p *approvalsActivities) lineItemFacts(ctx context.Context, activityID string) ([]approval.LineItemFact, error) {
	items, err := p.lineItems.ListByActivity(ctx, activityID)
	if err != nil {
		return nil, err
	}
	facts := make([]approval.LineItemFact, 0, len(items))
	for _, li := range items {
		facts = append(facts, approval.LineItemFact{
			ID: li.ID, Name: li.Name, PlannedCost: money.Money{Amount: li.PlannedCost, Currency: li.Currency}, Approved: li.Approved,
		})
	}
	return facts, nil
}
