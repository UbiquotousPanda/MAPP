package ranking

import (
	"cmp"
	"slices"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/measure"
)

// Index is one year's records and which of them are in view, each record's children in the plan's order.
type Index struct {
	byID       map[string]allwork.Node
	below      map[string][]string
	inView     map[string]bool
	matched    allwork.Matched
	attributes map[string]allwork.Attribute
}

func NewIndex(sc measure.Scope) *Index {
	x := &Index{byID: map[string]allwork.Node{}, below: map[string][]string{}, inView: map[string]bool{},
		matched: sc.Matched, attributes: map[string]allwork.Attribute{}}
	for _, a := range sc.Attributes {
		x.attributes[a.ID] = a
	}
	nodes := slices.Clone(sc.Nodes)
	slices.SortStableFunc(nodes, func(a, b allwork.Node) int { return cmp.Compare(a.Order, b.Order) })
	for _, n := range nodes {
		x.byID[n.ID] = n
		if n.ParentID != "" {
			x.below[n.ParentID] = append(x.below[n.ParentID], n.ID)
		}
	}
	m := sc.Matched
	for _, ids := range [][]string{m.Plans, m.Campaigns, m.Initiatives, m.Activities, m.LineItems} {
		for _, id := range ids {
			x.inView[id] = true
		}
	}
	return x
}

func (x *Index) Node(id string) allwork.Node {
	return x.byID[id]
}

func (x *Index) InView(id string) bool {
	return x.inView[id]
}

func (x *Index) Matched() allwork.Matched {
	return x.matched
}

// Below is every child of the record, in view or not.
func (x *Index) Below(id string) []string {
	return slices.Clone(x.below[id])
}

func (x *Index) ChildrenInView(id string) []string {
	return slices.DeleteFunc(x.Below(id), func(child string) bool { return !x.inView[child] })
}

// LevelIDs are the records in view at a Show level: campaigns unless the level names another.
func (x *Index) LevelIDs(level string) []string {
	m := x.matched
	ids, found := map[allwork.Level][]string{allwork.LevelPlan: m.Plans, allwork.LevelInitiative: m.Initiatives,
		allwork.LevelActivity: m.Activities}[allwork.Level(level)]
	if !found {
		return m.Campaigns
	}
	return ids
}

// Trail is the record and its ancestors, from the plan down.
func (x *Index) Trail(id string) []TrailStep {
	var trail []TrailStep
	for n, ok := x.byID[id]; ok; n, ok = x.byID[n.ParentID] {
		trail = append(trail, TrailStep{ID: n.ID, Level: string(n.Level), Name: n.Name})
	}
	slices.Reverse(trail)
	return trail
}

func (x *Index) drillable(id string) bool {
	n, found := x.byID[id]
	return found && x.inView[id] && n.Level != allwork.LevelLineItem
}

func (x *Index) searched(ids []string, search string) []string {
	if search == "" {
		return ids
	}
	wanted := strings.ToLower(search)
	return slices.DeleteFunc(slices.Clone(ids), func(id string) bool {
		return !strings.Contains(strings.ToLower(x.byID[id].Name), wanted)
	})
}
