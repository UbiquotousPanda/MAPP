package revenue

import (
	"context"
	"slices"

	"mapp/internal/allwork"

	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
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
		r, err := s.returnsOf(ctx, a, sc, series)
		if err != nil {
			return err
		}
		x := indexInView(sc, series, categoryOf(f.Own))
		figures := &revenueRanking{x: x, own: revenueFiguresOfActivities(series, r), memo: map[string]revenueSums{},
			display: money.DisplayIn(sc.Currency.Code, sc.Currency.Rate.String())}
		out = RevenueRanked{List: ranking.Build(x, showLevel(f.Show), q.shared(), figures),
			Attribution: attribution.ActualStamp(r.credited.Model)}
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
		x := indexInView(sc, series, categoryOf(f.Own))
		figures := &funnelRanking{x: x, own: funnelFiguresOfActivities(series, stage),
			previous: previousActualsOfActivities(series, stage), models: stampsOfActivities(series), memo: map[string]funnelSums{}}
		out = ranking.Build(x, showLevel(f.Show), q.shared(), figures)
		return nil
	})
	return out, err
}

// indexInView keeps only the activities in view, and with a category only the records above that hold one of them;
// revenue and funnel stop at the activity, so line items are never children.
func indexInView(sc measure.Scope, series []ActivitySeries, category string) *ranking.Index {
	narrowed := sc
	narrowed.Matched.Activities = make([]string, 0, len(series))
	for _, a := range series {
		narrowed.Matched.Activities = append(narrowed.Matched.Activities, a.ID)
	}
	narrowed.Matched.LineItems = nil
	if category != "" {
		narrowed.Matched = holdingActivities(narrowed.Matched, sc.Nodes)
	}
	return ranking.NewIndex(narrowed)
}

func holdingActivities(m allwork.Matched, nodes []allwork.Node) allwork.Matched {
	parentOf := make(map[string]string, len(nodes))
	for _, n := range nodes {
		parentOf[n.ID] = n.ParentID
	}
	holds := map[string]bool{}
	for _, id := range m.Activities {
		for p := parentOf[id]; p != "" && !holds[p]; p = parentOf[p] {
			holds[p] = true
		}
	}
	kept := func(ids []string) []string {
		return slices.DeleteFunc(slices.Clone(ids), func(id string) bool { return !holds[id] })
	}
	m.Plans, m.Campaigns, m.Initiatives = kept(m.Plans), kept(m.Campaigns), kept(m.Initiatives)
	return m
}

func showLevel(show string) string {
	if show == "" {
		return measure.ShowCampaign
	}
	return show
}

type revenueRanking struct {
	x       *ranking.Index
	own     map[string]revenueSums
	memo    map[string]revenueSums
	display money.Display
}

func (r *revenueRanking) Of(id string) revenueSums {
	if s, done := r.memo[id]; done {
		return s
	}
	s, isActivity := r.own[id]
	if !isActivity {
		for _, child := range r.x.ChildrenInView(id) {
			s = addRevenueSums(s, r.Of(child))
		}
	}
	r.memo[id] = s
	return s
}

func (*revenueRanking) Part(s revenueSums, share money.Percent) revenueSums {
	return revenueSums{figures: revenueTimes(s.figures, share), roiCredited: partOf(s.roiCredited, share), models: s.models}
}
func (*revenueRanking) Plus(a, b revenueSums) revenueSums { return addRevenueSums(a, b) }
func (r *revenueRanking) Shown(s revenueSums) RevenueFigures {
	f := withPerformance(withROI(s.figures, s.roiCredited), r.display)
	f.Projection = singleStamp(s.models)
	return f
}

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
	models   []Stamp
}

type funnelRanking struct {
	x        *ranking.Index
	own      map[string]FunnelFigures
	previous map[string]int64
	models   map[string][]Stamp
	memo     map[string]funnelSums
}

func (r *funnelRanking) Of(id string) funnelSums {
	if s, done := r.memo[id]; done {
		return s
	}
	f, isActivity := r.own[id]
	s := funnelSums{figures: f, previous: r.previous[id], models: r.models[id]}
	if !isActivity {
		for _, child := range r.x.ChildrenInView(id) {
			s = r.Plus(s, r.Of(child))
		}
	}
	r.memo[id] = s
	return s
}

func (*funnelRanking) Part(s funnelSums, share money.Percent) funnelSums {
	return funnelSums{figures: funnelTimes(s.figures, share), previous: share.OfWhole(s.previous), models: s.models}
}

func (*funnelRanking) Plus(a, b funnelSums) funnelSums {
	return funnelSums{figures: addFunnelFigures(a.figures, b.figures), previous: a.previous + b.previous,
		models: unionStamps(a.models, b.models)}
}

func (*funnelRanking) Shown(s funnelSums) FunnelFigures {
	f := withFunnelDerived(s.figures, s.previous)
	f.Projection = singleStamp(s.models)
	return f
}

func (*funnelRanking) Key(f FunnelFigures, sort string) (int64, bool) {
	v := f.Projected
	if sort == SortActual {
		v = f.Actual
	}
	return int64Of(v), v != nil
}
