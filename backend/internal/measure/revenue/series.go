package revenue

import (
	"context"
	"slices"
	"time"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// ActivitySeries is one activity in view with its figures month by month: the one read Revenue, Funnel stages and
// Summary build every figure on, so they never disagree.
type ActivitySeries struct {
	ID, Name, PlanID, ActivityTypeID string
	Owner                            *allwork.Owner
	TeamIDs                          []string
	// Attributes hold each Shell attribute's value on the activity or else on its nearest ancestor that has one.
	Attributes     map[string]allwork.AttrValue
	Goal           Goal
	HasProjection  bool
	Stages         []string
	ModelName      string
	ModelChangedAt time.Time
	FactsHeld      bool
	Sourced        []string
	Months         []Month
}

type Goal struct {
	INQ, MQL   *int64
	RevenueUSD *money.Amount
}

type Month struct {
	Key        string
	State      string
	INQ, MQL   Figure[int64]
	RevenueUSD Figure[money.Amount]
}

// Figure is one measure in one month. Actual is set up to the month in progress once the activity has a counted fact
// of the measure; Projected from the month in progress on. Goal places the goal in time with the plan's model and
// drops what lands after the plan year. Projected and Goal are nil when the model projects no such measure.
type Figure[T int64 | money.Amount] struct {
	Actual, Projected, Goal *T
}

func (s *Service) ActivitySeries(ctx context.Context, a actor.Actor, f measure.Filter, category string) (
	[]ActivitySeries, error,
) {
	var out []ActivitySeries
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		_, series, err := s.series(ctx, a, f, category)
		out = series
		return err
	})
	return out, err
}

func (s *Service) series(ctx context.Context, a actor.Actor, f measure.Filter, category string) (
	measure.Scope, []ActivitySeries, error,
) {
	sc, views, err := s.scopeAndActivities(ctx, a, f, category)
	if err != nil {
		return measure.Scope{}, nil, err
	}
	byID := make(map[string]allwork.Node, len(sc.Nodes))
	for _, n := range sc.Nodes {
		byID[n.ID] = n
	}
	w := window{today: date.Today(s.now()), year: sc.Year}
	out := make([]ActivitySeries, 0, len(views))
	for _, v := range views {
		out = append(out, seriesOf(v, byID, w))
	}
	return sc, out, nil
}

func seriesOf(v activityView, byID map[string]allwork.Node, w window) ActivitySeries {
	n, p := v.node, v.projection
	return ActivitySeries{
		ID: n.ID, Name: n.Name, PlanID: n.PlanID, ActivityTypeID: n.ActivityTypeID, Owner: n.Owner,
		TeamIDs: slices.Clone(byID[n.PlanID].TeamIDs), Attributes: attributesOf(byID, n.ID),
		Goal:          Goal{INQ: cloned(n.INQ), MQL: cloned(n.MQL), RevenueUSD: cloned(n.Revenue)},
		HasProjection: p.Present, Stages: stagesOf(v), ModelName: p.Stamp.ModelName,
		ModelChangedAt: p.Stamp.ModelChangedAt, Months: monthsOf(v, w),
		FactsHeld: factsHeld(n.Status), Sourced: slices.Clone(v.goals.Sourced),
	}
}

func attributesOf(byID map[string]allwork.Node, id string) map[string]allwork.AttrValue {
	out := map[string]allwork.AttrValue{}
	for n, ok := byID[id]; ok; n, ok = byID[n.ParentID] {
		for attributeID, value := range n.Attrs {
			if _, nearer := out[attributeID]; !nearer && (value.Yes != nil || len(value.OptionIDs) > 0) {
				out[attributeID] = value
			}
		}
	}
	return out
}

func stagesOf(v activityView) []string {
	stages := []string{}
	for _, stage := range []string{StageINQ, StageMQL} {
		if _, found := v.projection.Find(stage); found {
			stages = append(stages, stage)
		}
	}
	return stages
}

func cloned[T any](p *T) *T {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}
