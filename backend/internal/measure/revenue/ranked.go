package revenue

import (
	"context"

	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

// RankedRevenue is the ranked list of entries sorted by actual or projected revenue.
func (s *Service) RankedRevenue(ctx context.Context, a actor.Actor, f measure.Filter, q RankedQuery) (RevenueRanked, error) {
	var out RevenueRanked
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, series, err := s.series(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		x := indexInView(sc, series)
		figures := &revenueRanking{x: x, own: revenueFiguresOfActivities(series), memo: map[string]RevenueFigures{},
			display: money.DisplayIn(sc.Currency.Code, sc.Currency.Rate.String())}
		out = ranking.Build(x, showLevel(f.Show), q.shared(), figures)
		return nil
	})
	return out, err
}

// RankedFunnel is the ranked list sorted by the selected stage's actual or projected volume.
func (s *Service) RankedFunnel(ctx context.Context, a actor.Actor, f measure.Filter, q RankedQuery) (FunnelRanked, error) {
	var out FunnelRanked
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, series, err := s.series(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		stage := stageOf(q.Stage, availableStages(series))
		x := indexInView(sc, series)
		figures := &funnelRanking{x: x, own: funnelFiguresOfActivities(series, stage),
			previous: previousActualsOfActivities(series, stage), memo: map[string]funnelSums{}}
		out = ranking.Build(x, showLevel(f.Show), q.shared(), figures)
		return nil
	})
	return out, err
}

// indexInView keeps only the activities in view, the category's alone when one is chosen; revenue and funnel stop
// at the activity, so line items are never children.
func indexInView(sc measure.Scope, series []ActivitySeries) *ranking.Index {
	narrowed := sc
	narrowed.Matched.Activities = make([]string, 0, len(series))
	for _, a := range series {
		narrowed.Matched.Activities = append(narrowed.Matched.Activities, a.ID)
	}
	narrowed.Matched.LineItems = nil
	return ranking.NewIndex(narrowed)
}

func showLevel(show string) string {
	if show == "" {
		return measure.ShowCampaign
	}
	return show
}

type revenueRanking struct {
	x       *ranking.Index
	own     map[string]RevenueFigures
	memo    map[string]RevenueFigures
	display money.Display
}

func (r *revenueRanking) Of(id string) RevenueFigures {
	if f, done := r.memo[id]; done {
		return f
	}
	f, isActivity := r.own[id]
	if !isActivity {
		for _, child := range r.x.ChildrenInView(id) {
			f = addRevenueFigures(f, r.Of(child))
		}
	}
	r.memo[id] = f
	return f
}

func (*revenueRanking) Part(f RevenueFigures, share money.Percent) RevenueFigures {
	return revenueTimes(f, share)
}
func (*revenueRanking) Plus(a, b RevenueFigures) RevenueFigures { return addRevenueFigures(a, b) }
func (r *revenueRanking) Shown(f RevenueFigures) RevenueFigures { return withPerformance(f, r.display) }

func (*revenueRanking) Key(f RevenueFigures, sort string) (int64, bool) {
	m := f.Projected
	if sort == SortActualRevenue {
		m = f.Actual
	}
	return centsOf(m), m != nil
}

// funnelSums is an entry's figures with its previous-stage actual, which its conversion divides by.
type funnelSums struct {
	figures  FunnelFigures
	previous int64
}

type funnelRanking struct {
	x        *ranking.Index
	own      map[string]FunnelFigures
	previous map[string]int64
	memo     map[string]funnelSums
}

func (r *funnelRanking) Of(id string) funnelSums {
	if s, done := r.memo[id]; done {
		return s
	}
	f, isActivity := r.own[id]
	s := funnelSums{figures: f, previous: r.previous[id]}
	if !isActivity {
		for _, child := range r.x.ChildrenInView(id) {
			s = r.Plus(s, r.Of(child))
		}
	}
	r.memo[id] = s
	return s
}

func (*funnelRanking) Part(s funnelSums, share money.Percent) funnelSums {
	return funnelSums{figures: funnelTimes(s.figures, share), previous: share.OfWhole(s.previous)}
}

func (*funnelRanking) Plus(a, b funnelSums) funnelSums {
	return funnelSums{figures: addFunnelFigures(a.figures, b.figures), previous: a.previous + b.previous}
}

func (*funnelRanking) Shown(s funnelSums) FunnelFigures {
	return withFunnelDerived(s.figures, s.previous)
}

func (*funnelRanking) Key(f FunnelFigures, sort string) (int64, bool) {
	v := f.Projected
	if sort == SortActual {
		v = f.Actual
	}
	return int64Of(v), v != nil
}
