package summary

import (
	"context"
	"fmt"
	"time"

	"mapp/internal/allwork"
	"mapp/internal/financials"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

const (
	planOne     = "P-1"
	planTwo     = "P-2"
	pastMonths  = 5
	monthsInAll = 12
)

type fakeRead struct{}

func (fakeRead) Read(ctx context.Context, fn func(ctx context.Context) error) error { return fn(ctx) }

type fakes struct {
	scope      measure.Scope
	series     []revenue.ActivitySeries
	plans      map[string]revenue.Goal
	categories []revenue.Category
	spend      map[string]map[string]financials.Facts
	model      attribution.Model
	asked      string
	scopeReads int
}

func (f *fakes) ActivitySeriesIn(_ context.Context, _ actor.Actor, _ measure.Filter, category string) (
	measure.Scope, []revenue.ActivitySeries, error,
) {
	f.asked = category
	f.scopeReads++
	return f.scope, f.series, nil
}

func (f *fakes) PlanGoals(context.Context, []string) (map[string]revenue.Goal, error) {
	return f.plans, nil
}

func (f *fakes) ListCategories(context.Context) ([]revenue.Category, error) { return f.categories, nil }

func (f *fakes) SpendByMonth(context.Context, actor.Actor, []string) (map[string]map[string]financials.Facts, error) {
	return f.spend, nil
}

func (f *fakes) Designated(context.Context) (attribution.Model, error) { return f.model, nil }

func (f *fakes) service() *Service {
	deps := Deps{Series: f, PlanGoals: f, Spending: f, Attribution: f, Categories: f}
	return NewService(fakeRead{}, deps, func() time.Time { return time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC) })
}

// newFakes holds one projected activity in plan one and one without a model in plan two; every figure is in
// the comments of the tests that read it.
func newFakes() *fakes {
	return &fakes{
		scope: measure.Scope{Year: 2026, Currency: allwork.Currency{Code: money.BaseCurrency, Rate: money.One},
			Choices: allwork.Choices{SeesFinance: true},
			Nodes:   []allwork.Node{{ID: planOne, Level: allwork.LevelPlan}, {ID: planTwo, Level: allwork.LevelPlan}}},
		series: []revenue.ActivitySeries{projected("A-1", planOne), unprojected("A-2", planTwo)},
		plans: map[string]revenue.Goal{planOne: {INQ: ptr[int64](200), MQL: ptr[int64](40),
			RevenueUSD: ptr(money.FromCents(2_000_000))}},
		categories: []revenue.Category{{ID: "CAT-1", Name: "Events"}},
		model:      attribution.Equal,
	}
}

// projected: INQ 10, MQL 2 and 100.00 a month; June in progress has 4, 1 and 50.00 so far.
func projected(id, plan string) revenue.ActivitySeries {
	s := revenue.ActivitySeries{ID: id, Name: "Activity " + id, PlanID: plan, HasProjection: true,
		Stages: []string{string(StageINQ), string(StageMQL)}, AllowedStages: []string{string(StageINQ), string(StageMQL)},
		Goal: revenue.Goal{INQ: ptr[int64](100), MQL: ptr[int64](20), RevenueUSD: ptr(money.FromCents(1_000_000))}}
	for i := range monthsInAll {
		m := revenue.Month{Key: fmt.Sprintf("2026-%02d", i+1), State: revenue.StateFuture}
		m.INQ.Goal, m.MQL.Goal, m.RevenueUSD.Goal = ptr[int64](8), ptr[int64](2), ptr(money.FromCents(80_000))
		switch {
		case i < pastMonths:
			m.State = revenue.StatePast
			m.INQ.Actual, m.MQL.Actual, m.RevenueUSD.Actual = ptr[int64](10), ptr[int64](2), ptr(money.FromCents(10_000))
		case i == pastMonths:
			m.State = revenue.StateInProgress
			m.INQ.Actual, m.MQL.Actual, m.RevenueUSD.Actual = ptr[int64](4), ptr[int64](1), ptr(money.FromCents(5_000))
		}
		if i >= pastMonths {
			m.INQ.Projected, m.MQL.Projected, m.RevenueUSD.Projected = ptr[int64](10), ptr[int64](2), ptr(money.FromCents(10_000))
		}
		s.Months = append(s.Months, m)
	}
	return s
}

// unprojected has 200.00 of revenue in January, no goal and no model; its facts still count, as in Revenue.
func unprojected(id, plan string) revenue.ActivitySeries {
	s := revenue.ActivitySeries{ID: id, Name: "Activity " + id, PlanID: plan, Stages: []string{}}
	for i := range monthsInAll {
		m := revenue.Month{Key: fmt.Sprintf("2026-%02d", i+1), State: revenue.StateFuture}
		if i == 0 {
			m.State, m.RevenueUSD.Actual = revenue.StatePast, ptr(money.FromCents(20_000))
		}
		s.Months = append(s.Months, m)
	}
	return s
}
