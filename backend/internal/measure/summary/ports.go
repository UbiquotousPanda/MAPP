package summary

import (
	"context"

	"mapp/internal/financials"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
)

type Transactor interface {
	Read(ctx context.Context, fn func(ctx context.Context) error) error
}

type Scoper interface {
	Scope(ctx context.Context, a actor.Actor, f measure.Filter, columns []string) (measure.Scope, error)
}

// Series is 049's one read the three reports share; inside this report's Read it joins that snapshot.
type Series interface {
	ActivitySeries(ctx context.Context, a actor.Actor, f measure.Filter, category string) ([]revenue.ActivitySeries, error)
}

type PlanGoals interface {
	PlanGoals(ctx context.Context, planIDs []string) (map[string]revenue.Goal, error)
}

type Spending interface {
	SpendByMonth(ctx context.Context, a actor.Actor, lineItemIDs []string) (map[string]map[string]financials.Facts, error)
}

type Attribution interface {
	Designated(ctx context.Context) (attribution.Model, error)
}

type Categories interface {
	ListCategories(ctx context.Context) ([]revenue.Category, error)
}

type Deps struct {
	Scope       Scoper
	Series      Series
	PlanGoals   PlanGoals
	Spending    Spending
	Attribution Attribution
	Categories  Categories
}
