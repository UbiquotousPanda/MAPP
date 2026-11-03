package summary

import (
	"context"

	"mapp/internal/financials"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
)

type Transactor interface {
	Read(ctx context.Context, fn func(ctx context.Context) error) error
}

// Series is 049's one read the three reports share, with the scope it read, so Summary reads the scope once; inside
// this report's Read it joins that snapshot.
type Series interface {
	ActivitySeriesIn(ctx context.Context, a actor.Actor, f measure.Filter, category string) (
		measure.Scope, []revenue.ActivitySeries, error)
}

type PlanGoals interface {
	PlanGoals(ctx context.Context, planIDs []string) (map[string]revenue.Goal, error)
}

type Spending interface {
	SpendByMonth(ctx context.Context, a actor.Actor, lineItemIDs []string) (map[string]map[string]financials.Facts, error)
}

type Segments interface {
	SegmentLabel(ctx context.Context, id string) (string, error)
}

type Categories interface {
	ListCategories(ctx context.Context) ([]revenue.Category, error)
}

type Deps struct {
	Series     Series
	PlanGoals  PlanGoals
	Spending   Spending
	Categories Categories
	Segments   Segments
}
