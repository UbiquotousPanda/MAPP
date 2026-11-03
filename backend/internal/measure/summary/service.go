package summary

import (
	"context"
	"slices"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/clock"
)

type Service struct {
	tx   Transactor
	deps Deps
	now  clock.Clock
}

func NewService(tx Transactor, deps Deps, now clock.Clock) *Service {
	return &Service{tx: tx, deps: deps, now: now}
}

// view is everything one request reads, inside one snapshot.
type view struct {
	scope  measure.Scope
	series []revenue.ActivitySeries
	plans  map[string]revenue.Goal
}

func (s *Service) Report(ctx context.Context, a actor.Actor, f measure.Filter) (Report, error) {
	q, err := ParseQuery(f.Own)
	if err != nil {
		return Report{}, err
	}
	var out Report
	err = s.tx.Read(ctx, func(ctx context.Context) error {
		v, err := s.read(ctx, a, f, q.Category)
		if err != nil {
			return err
		}
		categories, err := s.deps.Categories.ListCategories(ctx)
		if err != nil {
			return err
		}
		out = v.report(newBuilder(v.scope, f.Period), categories)
		return nil
	})
	return out, err
}

func (s *Service) read(ctx context.Context, a actor.Actor, f measure.Filter, category string) (view, error) {
	sc, err := s.deps.Scope.Scope(ctx, a, f, nil)
	if err != nil {
		return view{}, err
	}
	series, err := s.deps.Series.ActivitySeries(ctx, a, f, category)
	if err != nil {
		return view{}, err
	}
	plans, err := s.deps.PlanGoals.PlanGoals(ctx, planIDsOf(series))
	if err != nil {
		return view{}, err
	}
	return view{scope: sc, series: series, plans: plans}, nil
}

func (v view) report(b builder, categories []revenue.Category) Report {
	return Report{
		Revenue: b.revenueSection(v.series, v.plans), Funnel: b.funnelSection(v.series),
		Categories: choicesOf(categories), States: statesOf(v.series), FinanceCovers: v.financeCovers(),
	}
}

func (v view) financeCovers() Covers {
	plans := planIDsOf(v.series)
	out := Covers{Of: len(plans)}
	for _, id := range plans {
		if v.seesFinance(id) {
			out.Plans++
		}
	}
	return out
}

func (v view) seesFinance(planID string) bool {
	c := v.scope.Choices
	return c.SeesFinance && (c.FinancePlans == nil || slices.Contains(c.FinancePlans, planID))
}

func statesOf(series []revenue.ActivitySeries) []string {
	if len(series) == 0 {
		return []string{StateNothingMatches}
	}
	states := []string{}
	if !slices.ContainsFunc(series, hasGoal) {
		states = append(states, StateNoGoals)
	}
	if !slices.ContainsFunc(series, hasActual) {
		states = append(states, StateNoPerformance)
	}
	return states
}

func hasGoal(s revenue.ActivitySeries) bool {
	return s.Goal.INQ != nil || s.Goal.MQL != nil || s.Goal.RevenueUSD != nil
}

func hasActual(s revenue.ActivitySeries) bool {
	return slices.ContainsFunc(s.Months, func(m revenue.Month) bool {
		return m.INQ.Actual != nil || m.MQL.Actual != nil || m.RevenueUSD.Actual != nil
	})
}

func choicesOf(categories []revenue.Category) []Choice {
	out := make([]Choice, 0, len(categories)+1)
	for _, c := range categories {
		out = append(out, Choice{ID: c.ID, Name: c.Name})
	}
	return append(out, Choice{ID: Uncategorised, Name: uncategorisedCategory})
}

func planIDsOf(series []revenue.ActivitySeries) []string {
	ids := make([]string, 0, len(series))
	for _, s := range series {
		ids = append(ids, s.PlanID)
	}
	slices.Sort(ids)
	return slices.Compact(ids)
}
