package app

import (
	"context"

	"mapp/internal/activity"
	"mapp/internal/lineitem"
	"mapp/internal/plan"
)

// treeRecords are the stored activities and line items of a view's plans, each decoded once for the whole read.
type treeRecords struct {
	activities []activity.Activity
	lineItems  []lineitem.LineItem
}

// readTrees reads the campaigns, initiatives, activities and line items of every plan of a view, one level at a
// time, so that the stores keep them for the transaction; it returns the activities and line items it decoded.
func (s allWorkSource) readTrees(ctx context.Context, list []plan.Plan) (treeRecords, error) {
	planIDs := make([]string, 0, len(list))
	for _, p := range list {
		planIDs = append(planIDs, p.ID)
	}
	campaignList, err := s.campaignsRepo.CampaignsOfPlans(ctx, planIDs)
	if err != nil {
		return treeRecords{}, err
	}
	campaignIDs := make([]string, 0, len(campaignList))
	for _, c := range campaignList {
		campaignIDs = append(campaignIDs, c.ID)
	}
	initiatives, err := s.campaignsRepo.InitiativesOfCampaigns(ctx, campaignIDs)
	if err != nil {
		return treeRecords{}, err
	}
	initiativeIDs := make([]string, 0, len(initiatives))
	for _, i := range initiatives {
		initiativeIDs = append(initiativeIDs, i.ID)
	}
	activityList, err := s.activitiesRepo.ListByInitiatives(ctx, initiativeIDs)
	if err != nil {
		return treeRecords{}, err
	}
	activityIDs := make([]string, 0, len(activityList))
	for _, a := range activityList {
		activityIDs = append(activityIDs, a.ID)
	}
	items, err := s.lineItemsRepo.ListByActivities(ctx, activityIDs)
	return treeRecords{activities: activityList, lineItems: items}, err
}
