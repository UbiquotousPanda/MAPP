package revenue

import (
	"cmp"
	"context"
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/projection"
)

// RankedFunnel is the ranked list sorted by the selected stage's actual or projected volume (FR-006, FR-017).
// q.Stage carries the selected stage, keeping the method within the argument limit.
func (s *Service) RankedFunnel(ctx context.Context, a actor.Actor, f measure.Filter, q RankedQuery) (FunnelRanked, error) {
	var out FunnelRanked
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, views, err := s.scopeAndActivities(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		in := funnelRankedInput{views: views, nodes: nodesForRanking(sc, views), stage: stageOf(q.Stage, availableStages(views)),
			show: showLevel(f.Show), w: window{today: date.Today(s.now()), year: sc.Year}, q: q}
		out = buildFunnelRanked(in)
		return nil
	})
	return out, err
}

// funnelRankedInput groups RankedFunnel's working parts so building the list stays within the argument limit.
type funnelRankedInput struct {
	views       []activityView
	nodes       []allwork.Node
	stage, show string
	w           window
	q           RankedQuery
}

// funnelTotals is every node's rolled-up figures and previous-stage actual, kept together as one value.
type funnelTotals struct {
	figures  map[string]FunnelFigures
	previous map[string]int64
}

func buildFunnelRanked(in funnelRankedInput) FunnelRanked {
	byID, below := nodeIndex(in.nodes)
	own := funnelFiguresOfActivities(in.views, in.stage, in.w)
	prevOwn := previousActualsOfActivities(in.views, in.stage, in.w)
	totals := funnelTotals{figures: rollUpFunnel(in.nodes, below, own), previous: rollUpInt64(in.nodes, below, prevOwn)}
	tops := searchByName(topLevelIDs(in.nodes, in.show), byID, in.q.Search)
	q := in.q
	show := in.show

	entries := make([]FunnelEntry, 0, len(tops))
	for _, id := range tops {
		entries = append(entries, funnelEntryOf(id, byID, below, totals))
	}
	sortFunnelEntries(entries, q.Sort, q.Order)

	total := len(entries)
	page := pageOfFunnelEntries(entries, q.Page, q.Size)
	group := FunnelGroup{Key: "", Label: "", Entries: page}
	var previousActual int64
	for _, e := range page {
		group.Totals = addFunnelFigures(group.Totals, e.Figures)
		previousActual += totals.previous[e.ID]
	}
	group.Totals = withFunnelDerived(group.Totals, previousActual)
	return FunnelRanked{Level: show, Sort: q.Sort, Order: q.Order, Group: GroupNone, Page: q.Page, Size: q.Size,
		Total: total, Trail: []TrailStep{}, Groups: []FunnelGroup{group}}
}

// previousActualsOfActivities is each activity's own actual count at the stage before the selected one, for
// every ranked entry's conversion (FR-017), the same rule the report's own cards use.
func previousActualsOfActivities(views []activityView, stage string, w window) map[string]int64 {
	previous, found := previousStage(stage)
	out := make(map[string]int64, len(views))
	if !found {
		return out
	}
	for _, v := range views {
		series, found := v.projection.Find(previous)
		if !found {
			continue
		}
		split := projection.SplitCounts(v.facts.counts[previous], series.Months, w.today, w.year)
		out[v.node.ID] = split.Actual
	}
	return out
}

func rollUpInt64(nodes []allwork.Node, below map[string][]string, own map[string]int64) map[string]int64 {
	totals := make(map[string]int64, len(nodes))
	var sum func(id string) int64
	sum = func(id string) int64 {
		if v, done := totals[id]; done {
			return v
		}
		children, hasChildren := below[id]
		if !hasChildren {
			v := own[id]
			totals[id] = v
			return v
		}
		var v int64
		for _, childID := range children {
			v += sum(childID)
		}
		totals[id] = v
		return v
	}
	for _, n := range nodes {
		sum(n.ID)
	}
	return totals
}

// funnelFiguresOfActivities is each activity's own figures for the selected stage: Goal is the stage's
// full plan-year projection, Actual every counted fact, and Projected the "actual or projected" total the
// cards show, split at today (FR-004, FR-017).
func funnelFiguresOfActivities(views []activityView, stage string, w window) map[string]FunnelFigures {
	out := make(map[string]FunnelFigures, len(views))
	for _, v := range views {
		series, found := v.projection.Find(stage)
		if !found {
			out[v.node.ID] = FunnelFigures{}
			continue
		}
		split := projection.SplitCounts(v.facts.counts[stage], series.Months, w.today, w.year)
		f := FunnelFigures{}
		if v.projection.Present {
			goal := series.Total
			f.Goal = &goal
		}
		actual := split.Actual
		f.Actual = &actual
		total := split.Actual + split.Projected
		f.Projected = &total
		out[v.node.ID] = f
	}
	return out
}

func rollUpFunnel(nodes []allwork.Node, below map[string][]string, ownActivity map[string]FunnelFigures) map[string]FunnelFigures {
	totals := make(map[string]FunnelFigures, len(nodes))
	var sum func(id string) FunnelFigures
	sum = func(id string) FunnelFigures {
		if f, done := totals[id]; done {
			return f
		}
		children, hasChildren := below[id]
		if !hasChildren {
			f := ownActivity[id]
			totals[id] = f
			return f
		}
		var f FunnelFigures
		for _, childID := range children {
			f = addFunnelFigures(f, sum(childID))
		}
		totals[id] = f
		return f
	}
	for _, n := range nodes {
		sum(n.ID)
	}
	return totals
}

func funnelEntryOf(id string, byID map[string]allwork.Node, below map[string][]string, totals funnelTotals) FunnelEntry {
	n := byID[id]
	entry := FunnelEntry{ID: n.ID, Level: string(n.Level), Name: n.Name, PlanID: n.PlanID,
		Figures: withFunnelDerived(totals.figures[id], totals.previous[id])}
	for _, childID := range below[id] {
		child := byID[childID]
		entry.Children = append(entry.Children, FunnelEntry{
			ID: child.ID, Level: string(child.Level), Name: child.Name, PlanID: child.PlanID,
			Figures: withFunnelDerived(totals.figures[childID], totals.previous[childID]),
		})
	}
	return entry
}

// withFunnelDerived derives Performance from Projected ÷ Goal and Conversion from Actual over the previous
// stage's actual (049-C15, 049-C16, FR-017) — the same formulas the cards use, so both stay correct whether
// f is one activity's own figures or a rolled-up total.
func withFunnelDerived(f FunnelFigures, previousActual int64) FunnelFigures {
	if f.Goal != nil {
		f.Performance = ratioCard(int64Of(f.Projected), *f.Goal, true).Value
	}
	f.Conversion = conversionCard(int64Of(f.Actual), &previousActual).Value
	return f
}

func addFunnelFigures(a, b FunnelFigures) FunnelFigures {
	a.Goal = addInt64Ptr(a.Goal, b.Goal)
	a.Actual = addInt64Ptr(a.Actual, b.Actual)
	a.Projected = addInt64Ptr(a.Projected, b.Projected)
	return a
}

func addInt64Ptr(a, b *int64) *int64 {
	if a == nil && b == nil {
		return nil
	}
	var sum int64
	if a != nil {
		sum += *a
	}
	if b != nil {
		sum += *b
	}
	return &sum
}

func sortFunnelEntries(entries []FunnelEntry, sort, order string) {
	slices.SortStableFunc(entries, func(a, b FunnelEntry) int {
		c := cmp.Compare(funnelFigureValue(a.Figures, sort), funnelFigureValue(b.Figures, sort))
		if order == OrderAsc {
			return c
		}
		return -c
	})
}

func funnelFigureValue(f FunnelFigures, sort string) int64 {
	if sort == SortActual {
		return int64Of(f.Actual)
	}
	return int64Of(f.Projected)
}

func int64Of(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func pageOfFunnelEntries(entries []FunnelEntry, page, size int) []FunnelEntry {
	start := (page - 1) * size
	if start >= len(entries) {
		return []FunnelEntry{}
	}
	end := min(start+size, len(entries))
	return entries[start:end]
}
