package app

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/measure/summary"
	"mapp/internal/plan"
	"mapp/internal/settings"
	"mapp/internal/stores"
)

// registerSummary registers the Summary report on 049's ActivitySeries.
func registerSummary(w *wiring, r *measure.Registry) error {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	service := summary.NewService(w.set.Tx, summary.Deps{
		Scope: w.reports, Series: revenueService(w), PlanGoals: summaryPlanGoals{plans: w.set.Plans, settings: w.settings},
		Spending: w.financials, Attribution: attribution.NewService(tools, w.set.Attribution),
		Categories: revenueCategories{settings: w.settings},
	}, w.now)
	mount(w.signedIn, summary.NewHandler(service))
	return r.Register(summary.NewReport(service))
}

// summaryPlanGoals works each plan's goal waterfall out as the plan page does, from the stored plan and its model
// read once each, so the statements stay fixed however many plans are in view.
type summaryPlanGoals struct {
	plans    stores.PlanStore
	settings *settings.Service
}

func (g summaryPlanGoals) PlanGoals(ctx context.Context, planIDs []string) (map[string]revenue.Goal, error) {
	out := make(map[string]revenue.Goal, len(planIDs))
	models := map[string]settings.Model{}
	for _, id := range planIDs {
		p, found, err := g.plans.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		if !found {
			continue
		}
		m, err := g.model(ctx, p.ModelID, models)
		if err != nil {
			return nil, err
		}
		out[id] = goalOf(plan.WaterfallUSD(p, m))
	}
	return out, nil
}

func (g summaryPlanGoals) model(ctx context.Context, id string, read map[string]settings.Model) (settings.Model, error) {
	if m, found := read[id]; found {
		return m, nil
	}
	m, _, err := g.settings.Model(ctx, id)
	read[id] = m
	return m, err
}

func goalOf(goals plan.GoalFigures) revenue.Goal {
	goal := revenue.Goal{INQ: goals.INQ, MQL: goals.MQL}
	if goals.Revenue != nil {
		goal.RevenueUSD = &goals.Revenue.Amount
	}
	return goal
}
