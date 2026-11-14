package app

import (
	"context"
	"errors"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/measure/summary"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
	"mapp/internal/settings"
	"mapp/internal/stores"
)

// registerSummary registers the Summary report on 049's ActivitySeries.
func registerSummary(w *wiring, r *measure.Registry) error {
	service := summary.NewService(w.set.Tx, summary.Deps{
		Series: revenueService(w), PlanGoals: summaryPlanGoals{plans: w.set.Plans, settings: w.settings},
		Spending: w.financials, Credits: w.crediting(),
		Categories: revenueCategories{settings: w.settings}, Segments: summarySegments{settings: w.settings},
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

// summarySegments names an attribute as Settings shows it; one that is gone gives "", so the export keeps its ID.
type summarySegments struct {
	settings *settings.Service
}

func (s summarySegments) SegmentLabel(ctx context.Context, id string) (string, error) {
	view, err := s.settings.GetAttribute(ctx, actor.System, id)
	if e, ok := errors.AsType[*errs.Error](err); ok && e.Code == errs.CodeNotFound {
		return "", nil
	}
	return view.Label, err
}
