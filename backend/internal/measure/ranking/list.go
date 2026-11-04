package ranking

import (
	"cmp"
	"slices"
	"strings"

	"mapp/internal/platform/money"
)

// Figures is what a report ranks by: S adds up and splits, F is what an entry shows, and Key is the whole number a
// sort ranks F by (cents for money, a count for a count); without one the entry goes last.
type Figures[S, F any] interface {
	Of(id string) S
	Part(s S, share money.Percent) S
	Plus(a, b S) S
	Shown(s S) F
	Key(f F, sort string) (int64, bool)
}

type placed[F any] struct {
	id    string
	share *money.Percent
	entry Entry[F]
}

type groupAcc[S, F any] struct {
	share
	items []placed[F]
	total S
}

type builder[S, F any] struct {
	x   *Index
	q   Query
	fig Figures[S, F]
}

// Build is one page of the level's entries in view, ranked, grouped and drilled.
func Build[S, F any](x *Index, level string, q Query, fig Figures[S, F]) List[F] {
	b := builder[S, F]{x: x, q: q, fig: fig}
	out := List[F]{Level: level, Sort: q.Sort, Order: q.Order, Group: q.Group, Page: q.Page, Size: q.Size,
		Trail: []TrailStep{}, Groups: []Group[F]{}}
	tops := x.LevelIDs(level)
	if q.Drill != "" {
		if x.drillable(q.Drill) {
			tops, out.Trail = []string{q.Drill}, x.Trail(q.Drill)
		} else {
			out.DrillLost = true
		}
	}
	groups := b.grouped(x.searched(tops, q.Search))
	for _, g := range groups {
		out.Total += len(g.items)
	}
	out.Groups = b.page(groups)
	return out
}

// grouped puts the entries in their groups, each group ranked, the groups ordered by their total.
func (b builder[S, F]) grouped(ids []string) []*groupAcc[S, F] {
	var groups []*groupAcc[S, F]
	byKey := map[string]*groupAcc[S, F]{}
	for _, id := range ids {
		whole := b.fig.Of(id)
		for _, g := range b.x.groupsOf(id, b.q.Group) {
			acc, found := byKey[g.key]
			if !found {
				acc = &groupAcc[S, F]{share: g}
				byKey[g.key], groups = acc, append(groups, acc)
			}
			s := b.part(whole, g.part)
			acc.items = append(acc.items, placed[F]{id: id, share: g.part, entry: b.entryOf(id, s)})
			acc.total = b.fig.Plus(acc.total, s)
		}
	}
	for _, g := range groups {
		slices.SortStableFunc(g.items, func(x, y placed[F]) int { return b.compare(x.entry, y.entry) })
	}
	slices.SortStableFunc(groups, func(x, y *groupAcc[S, F]) int {
		return b.compare(Entry[F]{Name: x.label, Figures: b.fig.Shown(x.total)}, Entry[F]{Name: y.label, Figures: b.fig.Shown(y.total)})
	})
	return groups
}

// page keeps one page of top entries across the groups; a group's totals stay those of the whole group.
func (b builder[S, F]) page(groups []*groupAcc[S, F]) []Group[F] {
	first, last := (b.q.Page-1)*b.q.Size, b.q.Page*b.q.Size
	out := []Group[F]{}
	seen := 0
	for _, g := range groups {
		group := Group[F]{Key: g.key, Label: g.label, Totals: b.fig.Shown(g.total), Entries: []Entry[F]{}}
		for _, p := range g.items {
			if seen >= first && seen < last {
				p.entry.Children = b.childrenOf(p.id, p.share)
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

func (b builder[S, F]) childrenOf(id string, share *money.Percent) []Entry[F] {
	children := []Entry[F]{}
	for _, child := range b.x.ChildrenInView(id) {
		children = append(children, b.entryOf(child, b.part(b.fig.Of(child), share)))
	}
	slices.SortStableFunc(children, b.compare)
	return children
}

func (b builder[S, F]) part(s S, share *money.Percent) S {
	if share == nil {
		return s
	}
	return b.fig.Part(s, *share)
}

func (b builder[S, F]) entryOf(id string, s S) Entry[F] {
	n := b.x.byID[id]
	return Entry[F]{ID: id, Level: string(n.Level), Name: n.Name, PlanID: n.PlanID, Owner: n.Owner, Figures: b.fig.Shown(s)}
}

// compare ranks by the sort's key in the chosen order, entries without one last, then by name.
func (b builder[S, F]) compare(x, y Entry[F]) int {
	a, hasA := b.fig.Key(x.Figures, b.q.Sort)
	c, hasC := b.fig.Key(y.Figures, b.q.Sort)
	switch {
	case !hasA && !hasC:
		return strings.Compare(x.Name, y.Name)
	case !hasA:
		return 1
	case !hasC:
		return -1
	}
	order := cmp.Compare(a, c)
	if b.q.Order == OrderDesc {
		order = -order
	}
	return cmp.Or(order, strings.Compare(x.Name, y.Name))
}
