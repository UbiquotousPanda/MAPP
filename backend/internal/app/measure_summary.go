package app

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/measure/summary"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
)

// registerSummary registers the Summary report of feature 048 on 049's ActivitySeries (048-C10).
func registerSummary(w *wiring, r *measure.Registry) error {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	service := summary.NewService(w.set.Tx, summary.Deps{
		Scope: w.reports, Series: revenueService(w), PlanGoals: summaryPlanGoals{plans: w.plans},
		Spending: w.financials, Attribution: attribution.NewService(tools, w.set.Attribution),
		Categories: revenueCategories{settings: w.settings},
	}, w.now)
	mount(w.signedIn, summary.NewHandler(service))
	return r.Register(summary.NewReport(service))
}

// summaryPlanGoals reads each plan's goal waterfall as 004 shows it, in USD, as the plan fields of the frame do.
type summaryPlanGoals struct {
	plans *plan.Service
}

func (g summaryPlanGoals) PlanGoals(ctx context.Context, planIDs []string) (map[string]revenue.Goal, error) {
	out := make(map[string]revenue.Goal, len(planIDs))
	for _, id := range planIDs {
		view, err := g.plans.Get(ctx, actor.System, id)
		if err != nil {
			return nil, err
		}
		goals := view.Goals.Plan
		goal := revenue.Goal{INQ: goals.INQ, MQL: goals.MQL}
		if goals.Revenue != nil {
			goal.RevenueUSD = &goals.Revenue.Amount
		}
		out[id] = goal
	}
	return out, nil
}
