package revenue

import (
	"cmp"
	"context"
	"slices"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

// RankedFunnel is the ranked list sorted by the selected stage's actual or projected volume.
func (s *Service) RankedFunnel(ctx context.Context, a actor.Actor, f measure.Filter, q RankedQuery) (FunnelRanked, error) {
	var out FunnelRanked
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		sc, series, err := s.series(ctx, a, f, categoryOf(f.Own))
		if err != nil {
			return err
		}
		in := funnelRankedInput{series: series, nodes: nodesForRanking(sc, series), matched: sc.Matched,
			attrs: attributesByID(sc.Attributes), stage: stageOf(q.Stage, availableStages(series)),
			show: showLevel(f.Show), q: q}
		out = buildFunnelRanked(in)
		return nil
	})
	return out, err
}

type funnelRankedInput struct {
	series      []ActivitySeries
	nodes       []allwork.Node
	matched     allwork.Matched
	attrs       map[string]allwork.Attribute
	stage, show string
	q           RankedQuery
}

// funnelIndex is every node and figure buildFunnelRanked needs, kept together as one value.
type funnelIndex struct {
	nodes    []allwork.Node
	byID     map[string]allwork.Node
	below    map[string][]string
	figures  map[string]FunnelFigures
	previous map[string]int64
	attrs    map[string]allwork.Attribute
}

// buildFunnelRanked builds one page of entries across their groups, with drill, 040's own rules exactly.
func buildFunnelRanked(in funnelRankedInput) FunnelRanked {
	byID, below := nodeIndex(in.nodes)
	own := funnelFiguresOfActivities(in.series, in.stage)
	prevOwn := previousActualsOfActivities(in.series, in.stage)
	idx := funnelIndex{nodes: in.nodes, byID: byID, below: below, attrs: in.attrs,
		figures: rollUpFunnel(in.nodes, below, own), previous: rollUpInt64(in.nodes, below, prevOwn)}

	tops, trail, drillLost := funnelTops(idx, in.matched, in.show, in.q.Drill)
	tops = searchByName(tops, byID, in.q.Search)

	groups := funnelGroups(idx, tops, in.q)
	total := 0
	for _, g := range groups {
		total += len(g.items)
	}
	pages := funnelPage(groups, in.q)
	return FunnelRanked{Level: in.show, Sort: in.q.Sort, Order: in.q.Order, Group: in.q.Group, Page: in.q.Page, Size: in.q.Size,
		Total: total, Trail: trail, Groups: pages, DrillLost: drillLost}
}

// funnelTops is the entries to group and page: the Show level, or the one drilled record.
func funnelTops(idx funnelIndex, matched allwork.Matched, show, drill string) ([]string, []TrailStep, bool) {
	if drill == "" {
		return topLevelIDs(idx.nodes, show), []TrailStep{}, false
	}
	if _, ok := idx.byID[drill]; ok && inViewSet(matched)[drill] {
		return []string{drill}, trailOf(idx.byID, drill), false
	}
	return topLevelIDs(idx.nodes, show), []TrailStep{}, true
}

type funnelPlaced struct {
	id    string
	share *money.Percent
	entry FunnelEntry
}

type funnelGroupAcc struct {
	groupShare
	items    []funnelPlaced
	total    FunnelFigures
	previous int64
}

// funnelGroups puts the entries in their groups, each group ranked, the groups ordered by their total.
func funnelGroups(idx funnelIndex, ids []string, q RankedQuery) []*funnelGroupAcc {
	var groups []*funnelGroupAcc
	byKey := map[string]*funnelGroupAcc{}
	for _, id := range ids {
		whole := idx.figures[id]
		for _, g := range groupsOf(idx.byID, idx.attrs, id, q.Group) {
			acc, found := byKey[g.key]
			if !found {
				acc = &funnelGroupAcc{groupShare: g}
				byKey[g.key], groups = acc, append(groups, acc)
			}
			s := funnelShare{figures: funnelTimes(whole, g.part), previous: funnelTimesInt64(idx.previous[id], g.part), part: g.part}
			acc.items = append(acc.items, funnelPlaced{id: id, share: g.part, entry: funnelEntryOf(idx, id, s)})
			acc.total, acc.previous = addFunnelFigures(acc.total, s.figures), acc.previous+s.previous
		}
	}
	for _, g := range groups {
		slices.SortStableFunc(g.items, func(x, y funnelPlaced) int { return compareFunnel(x.entry, y.entry, q) })
	}
	slices.SortStableFunc(groups, func(x, y *funnelGroupAcc) int {
		return compareFunnel(FunnelEntry{Name: x.label, Figures: withFunnelDerived(x.total, x.previous)},
			FunnelEntry{Name: y.label, Figures: withFunnelDerived(y.total, y.previous)}, q)
	})
	return groups
}

// funnelPage keeps one page of top entries across the groups; a group's totals stay those of the whole group.
func funnelPage(groups []*funnelGroupAcc, q RankedQuery) []FunnelGroup {
	first, last := (q.Page-1)*q.Size, q.Page*q.Size
	out := []FunnelGroup{}
	seen := 0
	for _, g := range groups {
		group := FunnelGroup{Key: g.key, Label: g.label, Totals: withFunnelDerived(g.total, g.previous), Entries: []FunnelEntry{}}
		for _, p := range g.items {
			if seen >= first && seen < last {
				group.Entries = append(group.Entries, p.entry)
			}
			seen++
		}
		if len(group.Entries) > 0 {
			out = append(out, group)
		}
	}
	return out
}

// funnelShare is one entry's figures, previous-stage actual and the % split that produced them, together.
type funnelShare struct {
	figures  FunnelFigures
	previous int64
	part     *money.Percent
}

// funnelEntryOf builds one entry, with its children one level below scaled by the same share.
func funnelEntryOf(idx funnelIndex, id string, s funnelShare) FunnelEntry {
	n := idx.byID[id]
	entry := FunnelEntry{ID: n.ID, Level: string(n.Level), Name: n.Name, PlanID: n.PlanID,
		Figures: withFunnelDerived(s.figures, s.previous)}
	for _, childID := range idx.below[id] {
		child := idx.byID[childID]
		entry.Children = append(entry.Children, FunnelEntry{
			ID: child.ID, Level: string(child.Level), Name: child.Name, PlanID: child.PlanID,
			Figures: withFunnelDerived(funnelTimes(idx.figures[childID], s.part), funnelTimesInt64(idx.previous[childID], s.part)),
		})
	}
	return entry
}

// compareFunnel ranks by the sort figure in the chosen order, entries without it last, then by name.
func compareFunnel(x, y FunnelEntry, q RankedQuery) int {
	a, hasA := funnelFigureOf(x.Figures, q.Sort)
	b, hasB := funnelFigureOf(y.Figures, q.Sort)
	switch {
	case !hasA && !hasB:
		return strings.Compare(x.Name, y.Name)
	case !hasA:
		return 1
	case !hasB:
		return -1
	}
	order := cmp.Compare(a, b)
	if q.Order == OrderDesc {
		order = -order
	}
	return cmp.Or(order, strings.Compare(x.Name, y.Name))
}

func funnelFigureOf(f FunnelFigures, sort string) (int64, bool) {
	v := f.Projected
	if sort == SortActual {
		v = f.Actual
	}
	return int64Of(v), v != nil
}
