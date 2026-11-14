// Package plantest is the in-memory fake of the plans store, for tests that build services or the whole API
// without a database.
package plantest

import (
	"context"
	"slices"

	"mapp/internal/plan"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/fake"
)

type Store struct {
	plans *fake.Table[plan.Plan]
}

func NewStore(db *fake.DB) Store {
	plans := fake.TableOf(db, "plans", func(p plan.Plan) string { return p.ID }).
		Unique("plans_name_key", func(p plan.Plan) string { return fake.LowerC(p.Name) }).
		Check("plans_budget_minor_check", func(p plan.Plan) bool { return p.Budget == nil || p.Budget.Sign() >= 0 }).
		Check("plans_year_check", func(p plan.Plan) bool { return p.Year >= 2000 && p.Year <= 2100 }).
		References("plans_currency_fkey", "currencies", func(p plan.Plan) string { return p.Currency })
	return Store{plans: plans}
}

func (s Store) Get(_ context.Context, id string) (plan.Plan, bool, error) {
	return s.plans.Get(id)
}

func (s Store) List(context.Context) ([]plan.Plan, error) {
	return s.plans.List()
}

func (s Store) ListInScope(_ context.Context, scope authz.Scope) ([]plan.Plan, error) {
	return s.plans.Where(func(p plan.Plan) bool { return scope.Sees(plan.AccessFacts(p)) })
}

func (s Store) GetInScope(_ context.Context, scope authz.Scope, id string) (plan.Plan, bool, error) {
	p, found, err := s.plans.Get(id)
	if err != nil || !found || !scope.Sees(plan.AccessFacts(p)) {
		return plan.Plan{}, false, err
	}
	return p, true, nil
}

func (s Store) ListByIDs(_ context.Context, ids []string) ([]plan.Plan, error) {
	return s.plans.Where(func(p plan.Plan) bool { return slices.Contains(ids, p.ID) })
}

func (s Store) PlansOfYear(_ context.Context, year int) ([]plan.Plan, error) {
	return s.plans.Where(func(p plan.Plan) bool { return p.Year == year })
}

func (s Store) Put(ctx context.Context, p plan.Plan) error {
	return s.plans.Put(ctx, p.Normalised())
}

func (s Store) Delete(ctx context.Context, id string) error {
	return s.plans.Delete(ctx, id)
}
