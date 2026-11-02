package revenue

import (
	"cmp"
	"slices"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

// revenueRankedInput groups revenueRanked's working parts so building it stays within the argument limit.
type revenueRankedInput struct {
	views   []activityView
	nodes   []allwork.Node
	matched allwork.Matched
	attrs   map[string]allwork.Attribute
	show    string
	q       RankedQuery
	w       window
}

// revenueIndex is every node and figure revenueRanked needs, kept together as one value.
type revenueIndex struct {
	nodes  []allwork.Node
	byID   map[string]allwork.Node
	below  map[string][]string
	totals map[string]RevenueFigures
	attrs  map[string]allwork.Attribute
}

// revenueRanked builds one page of entries across their groups, with drill, 040's own rules exactly (049-C18).
func revenueRanked(in revenueRankedInput) RevenueRanked {
	byID, below := nodeIndex(in.nodes)
	own := revenueFiguresOfActivities(in.views, in.w)
	idx := revenueIndex{nodes: in.nodes, byID: byID, below: below, totals: rollUpRevenue(in.nodes, below, own), attrs: in.attrs}

	tops, trail, drillLost := revenueTops(idx, in.matched, in.show, in.q.Drill)
	tops = searchByName(tops, byID, in.q.Search)

	groups := revenueGroups(idx, tops, in.q)
	total := 0
	for _, g := range groups {
		total += len(g.items)
	}
	pages := revenuePage(groups, in.q)
	return RevenueRanked{Level: in.show, Sort: in.q.Sort, Order: in.q.Order, Group: in.q.Group, Page: in.q.Page, Size: in.q.Size,
		Total: total, Trail: trail, Groups: pages, DrillLost: drillLost}
}

// revenueTops is the entries to group and page: the Show level, or the one drilled record (FR-005, 049-C18).
func revenueTops(idx revenueIndex, matched allwork.Matched, show, drill string) ([]string, []TrailStep, bool) {
	if drill == "" {
		return topLevelIDs(idx.nodes, show), []TrailStep{}, false
	}
	if _, ok := idx.byID[drill]; ok && inViewSet(matched)[drill] {
		return []string{drill}, trailOf(idx.byID, drill), false
	}
	return topLevelIDs(idx.nodes, show), []TrailStep{}, true
}

// revenuePlaced is one top entry in one group, with its share when a % split puts it in several.
type revenuePlaced struct {
	id    string
	share *money.Percent
	entry RevenueEntry
}

type revenueGroupAcc struct {
	groupShare
	items []revenuePlaced
	total RevenueFigures
}

// revenueGroups puts the entries in their groups, each group ranked, the groups ordered by their total.
func revenueGroups(idx revenueIndex, ids []string, q RankedQuery) []*revenueGroupAcc {
	var groups []*revenueGroupAcc
	byKey := map[string]*revenueGroupAcc{}
	for _, id := range ids {
		whole := idx.totals[id]
		for _, g := range groupsOf(idx.byID, idx.attrs, id, q.Group) {
			acc, found := byKey[g.key]
			if !found {
				acc = &revenueGroupAcc{groupShare: g}
				byKey[g.key], groups = acc, append(groups, acc)
			}
			s := revenueTimes(whole, g.part)
			acc.items = append(acc.items, revenuePlaced{id: id, share: g.part, entry: revenueEntryOf(idx, id, s, g.part)})
			acc.total = addRevenueFigures(acc.total, s)
		}
	}
	for _, g := range groups {
		slices.SortStableFunc(g.items, func(x, y revenuePlaced) int { return compareRevenue(x.entry, y.entry, q) })
	}
	slices.SortStableFunc(groups, func(x, y *revenueGroupAcc) int {
		return compareRevenue(RevenueEntry{Name: x.label, Figures: withPerformance(x.total)},
			RevenueEntry{Name: y.label, Figures: withPerformance(y.total)}, q)
	})
	return groups
}

// revenuePage keeps one page of top entries across the groups; a group's totals stay those of the whole group.
func revenuePage(groups []*revenueGroupAcc, q RankedQuery) []RevenueGroup {
	first, last := (q.Page-1)*q.Size, q.Page*q.Size
	out := []RevenueGroup{}
	seen := 0
	for _, g := range groups {
		group := RevenueGroup{Key: g.key, Label: g.label, Totals: withPerformance(g.total), Entries: []RevenueEntry{}}
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

func nodeIndex(nodes []allwork.Node) (map[string]allwork.Node, map[string][]string) {
	byID := make(map[string]allwork.Node, len(nodes))
	below := map[string][]string{}
	for _, n := range nodes {
		byID[n.ID] = n
	}
	for _, n := range nodes {
		if n.ParentID != "" {
			below[n.ParentID] = append(below[n.ParentID], n.ID)
		}
	}
	return byID, below
}

func topLevelIDs(nodes []allwork.Node, show string) []string {
	ids := make([]string, 0, len(nodes))
	for _, n := range nodes {
		if string(n.Level) == show {
			ids = append(ids, n.ID)
		}
	}
	return ids
}

func searchByName(ids []string, byID map[string]allwork.Node, search string) []string {
	if search == "" {
		return ids
	}
	wanted := strings.ToLower(search)
	found := make([]string, 0, len(ids))
	for _, id := range ids {
		if strings.Contains(strings.ToLower(byID[id].Name), wanted) {
			found = append(found, id)
		}
	}
	return found
}

// revenueEntryOf builds one entry, with its children one level below scaled by the same share (049-C18).
func revenueEntryOf(idx revenueIndex, id string, figures RevenueFigures, part *money.Percent) RevenueEntry {
	n := idx.byID[id]
	entry := RevenueEntry{ID: n.ID, Level: string(n.Level), Name: n.Name, PlanID: n.PlanID, Figures: withPerformance(figures)}
	for _, childID := range idx.below[id] {
		child := idx.byID[childID]
		entry.Children = append(entry.Children, RevenueEntry{
			ID: child.ID, Level: string(child.Level), Name: child.Name, PlanID: child.PlanID,
			Figures: withPerformance(revenueTimes(idx.totals[childID], part)),
		})
	}
	return entry
}

// compareRevenue ranks by the sort figure in the chosen order, entries without it last, then by name (049-C18).
func compareRevenue(x, y RevenueEntry, q RankedQuery) int {
	a, hasA := revenueFigureOf(x.Figures, q.Sort)
	b, hasB := revenueFigureOf(y.Figures, q.Sort)
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

func revenueFigureOf(f RevenueFigures, sort string) (int64, bool) {
	m := f.Projected
	if sort == SortActualRevenue {
		m = f.Actual
	}
	return centsOf(m), m != nil
}
