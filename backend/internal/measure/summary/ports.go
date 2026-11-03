package summary

import (
	"context"

	"mapp/internal/financials"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
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

// Credits is 050's crediting: the revenue its designated model credits to each activity.
type Credits interface {
	Credit(ctx context.Context, scope authz.Scope, activityIDs []string, year int) (attribution.Credited, error)
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
	Credits    Credits
	Categories Categories
	Segments   Segments
}
