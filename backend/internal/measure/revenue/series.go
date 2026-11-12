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
	InqToMqlRate   *money.Percent
	FactsHeld      bool
	AllowedStages  []string
	Sourced        []string
	ExcludedFacts  int
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
	_, series, err := s.ActivitySeriesIn(ctx, a, f, category)
	return series, err
}

// ActivitySeriesIn also returns the scope it read, so a caller that needs the scope too reads it once.
func (s *Service) ActivitySeriesIn(ctx context.Context, a actor.Actor, f measure.Filter, category string) (
	measure.Scope, []ActivitySeries, error,
) {
	var sc measure.Scope
	var out []ActivitySeries
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		var err error
		sc, out, err = s.series(ctx, a, f, category)
		return err
	})
	return sc, out, err
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
		ModelChangedAt: p.Stamp.ModelChangedAt, InqToMqlRate: rateOf(v), Months: monthsOf(v, w),
		FactsHeld: factsHeld(n.Status), AllowedStages: slices.Clone(v.goals.AllowedStages),
		Sourced: slices.Clone(v.goals.Sourced), ExcludedFacts: v.facts.excluded,
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

func rateOf(v activityView) *money.Percent {
	if !v.projection.Present {
		return nil
	}
	rate := v.goals.Model.InqToMqlRate
	return &rate
}

func cloned[T any](p *T) *T {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}
