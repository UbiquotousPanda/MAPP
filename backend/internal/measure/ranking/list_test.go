package ranking_test

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

type count struct {
	N   int64
	Has bool
}

// counts ranks campaigns by their activities' counts in view, as a report adds up its own figures.
type counts struct {
	x    *ranking.Index
	leaf map[string]int64
}

func (c counts) Of(id string) count {
	if n, found := c.leaf[id]; found {
		return count{N: n, Has: true}
	}
	var s count
	for _, child := range c.x.ChildrenInView(id) {
		s = c.Plus(s, c.Of(child))
	}
	return s
}

func (counts) Part(s count, share ranking.Slice) count {
	return count{N: share.OfWhole(s.N), Has: s.Has}
}
func (counts) Plus(a, b count) count               { return count{N: a.N + b.N, Has: a.Has || b.Has} }
func (counts) Shown(s count) count                 { return s }
func (counts) Key(f count, _ string) (int64, bool) { return f.N, f.Has }

// fixture: P-1 › Alpha (Ann, Brand 60/40) › Ad 10, Banner 99 (not in view) · Beta (Yes) › Call 20 · Gamma (not in view) ›
// Demo 50 · Delta, with nothing below it; Ad has the line item Stand.
func fixture() (*ranking.Index, counts) {
	ann := &allwork.Owner{ID: "U-1", Name: "Ann Lee"}
	brand := allwork.AttrValue{OptionIDs: []string{"SO-A", "SO-B"},
		Shares: map[string]money.Percent{"SO-A": money.PercentFromHundredths(6000), "SO-B": money.PercentFromHundredths(4000)}}
	node := func(level allwork.Level, id, parent, name string, order int) allwork.Node {
		return allwork.Node{Level: level, ID: id, ParentID: parent, PlanID: "P-1", Name: name, Order: order}
	}
	alpha := node(allwork.LevelCampaign, "C-1", "P-1", "Alpha", 1)
	alpha.Owner, alpha.Attrs = ann, map[string]allwork.AttrValue{"SA-1": brand}
	gamma := node(allwork.LevelCampaign, "C-3", "P-1", "Gamma", 3)
	gamma.Owner = ann
	yes := true
	beta := node(allwork.LevelCampaign, "C-2", "P-1", "Beta", 2)
	beta.Attrs = map[string]allwork.AttrValue{"SA-2": {Yes: &yes}}
	sc := measure.Scope{
		Nodes: []allwork.Node{node(allwork.LevelPlan, "P-1", "", "Plan one", 0), alpha, beta, gamma, node(allwork.LevelCampaign, "C-4", "P-1", "Delta", 4),
			node(allwork.LevelActivity, "A-1", "C-1", "Ad", 1), node(allwork.LevelActivity, "A-2", "C-1", "Banner", 2),
			node(allwork.LevelActivity, "A-3", "C-2", "Call", 1), node(allwork.LevelActivity, "A-4", "C-3", "Demo", 1),
			node(allwork.LevelLineItem, "L-1", "A-1", "Stand", 1)},
		Matched: allwork.Matched{Plans: []string{"P-1"}, Campaigns: []string{"C-1", "C-2", "C-4"},
			Activities: []string{"A-1", "A-3"}, LineItems: []string{"L-1"}},
		Attributes: []allwork.Attribute{{ID: "SA-1", Label: "Brand",
			Options: []allwork.Option{{ID: "SO-A", Label: "Helix"}, {ID: "SO-B", Label: "Pennzoil"}}}},
	}
	x := ranking.NewIndex(sc)
	return x, counts{x: x, leaf: map[string]int64{"A-1": 10, "A-2": 99, "A-3": 20, "A-4": 50}}
}

func build(t *testing.T, q ranking.Query) ranking.List[count] {
	t.Helper()
	defaults := ranking.Query{Sort: "n", Order: ranking.OrderDesc, Group: ranking.GroupNone, Page: 1, Size: 10}
	if q.Order == "" {
		q.Order = defaults.Order
	}
	if q.Group == "" {
		q.Group = defaults.Group
	}
	if q.Size == 0 {
		q.Size = defaults.Size
	}
	q.Sort, q.Page = defaults.Sort, max(q.Page, defaults.Page)
	x, figures := fixture()
	return ranking.Build(x, "campaign", q, figures)
}

// lines are the page as text: "group: entry n [child n, …]".
func lines(l ranking.List[count]) []string {
	var out []string
	for _, g := range l.Groups {
		for _, e := range g.Entries {
			var children []string
			for _, c := range e.Children {
				children = append(children, fmt.Sprintf("%s %d", c.Name, c.Figures.N))
			}
			out = append(out, fmt.Sprintf("%s: %s %d %v", g.Label, e.Name, e.Figures.N, children))
		}
	}
	return out
}

func TestBuild_RanksInViewByKeyWithoutOneLast_040_FR009(t *testing.T) {
	t.Parallel()
	want := []string{": Beta 20 [Call 20]", ": Alpha 10 [Ad 10]", ": Delta 0 []"}
	if diff := cmp.Diff(want, lines(build(t, ranking.Query{}))); diff != "" {
		t.Errorf("largest first, Gamma and Banner not in view (-want +got):\n%s", diff)
	}
	want = []string{": Alpha 10 [Ad 10]", ": Beta 20 [Call 20]", ": Delta 0 []"}
	if diff := cmp.Diff(want, lines(build(t, ranking.Query{Order: ranking.OrderAsc}))); diff != "" {
		t.Errorf("smallest first, Delta with no figure still last (-want +got):\n%s", diff)
	}
}

func TestBuild_GroupsCountSplitsByShare_040_FR013(t *testing.T) {
	t.Parallel()
	byBrand := build(t, ranking.Query{Group: "attr:SA-1"})
	want := []string{"Not filled in: Beta 20 [Call 20]", "Not filled in: Delta 0 []", "Helix: Alpha 6 [Ad 6]",
		"Pennzoil: Alpha 4 [Ad 4]"}
	if diff := cmp.Diff(want, lines(byBrand)); diff != "" || byBrand.Total != 4 {
		t.Errorf("by Brand, Alpha split 60/40, %d placed (-want +got):\n%s", byBrand.Total, diff)
	}
	want = []string{"No owner: Beta 20 [Call 20]", "No owner: Delta 0 []", "Ann Lee: Alpha 10 [Ad 10]"}
	if diff := cmp.Diff(want, lines(build(t, ranking.Query{Group: ranking.GroupOwner}))); diff != "" {
		t.Errorf("by owner, groups by their total (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]string{"Plan one: Beta 20 [Call 20]", "Plan one: Alpha 10 [Ad 10]", "Plan one: Delta 0 []"},
		lines(build(t, ranking.Query{Group: ranking.GroupPlan}))); diff != "" {
		t.Errorf("by plan (-want +got):\n%s", diff)
	}
	want = []string{"Yes: Beta 20 [Call 20]", "Not filled in: Alpha 10 [Ad 10]", "Not filled in: Delta 0 []"}
	if diff := cmp.Diff(want, lines(build(t, ranking.Query{Group: "attr:SA-2"}))); diff != "" {
		t.Errorf("by a yes/no attribute (-want +got):\n%s", diff)
	}
}

func TestBuild_DrillWithTrailOrLost_040_FR010(t *testing.T) {
	t.Parallel()
	drilled := build(t, ranking.Query{Drill: "C-1"})
	var trail []string
	for _, step := range drilled.Trail {
		trail = append(trail, step.Name)
	}
	if diff := cmp.Diff([]string{": Alpha 10 [Ad 10]"}, lines(drilled)); diff != "" || strings.Join(trail, " › ") != "Plan one › Alpha" {
		t.Errorf("drilled into Alpha, trail %v (-want +got):\n%s", trail, diff)
	}
	for _, id := range []string{"L-1", "C-3", "C-99"} {
		if lost := build(t, ranking.Query{Drill: id}); !lost.DrillLost || lost.Total != 3 || len(lost.Trail) != 0 {
			t.Errorf("drill to %s: lost %t, %d entries; want the level's list back", id, lost.DrillLost, lost.Total)
		}
	}
}

func TestBuild_PagesAcrossGroupsWithWholeTotals_040_FR014(t *testing.T) {
	t.Parallel()
	second := build(t, ranking.Query{Size: 1, Page: 2})
	if diff := cmp.Diff([]string{": Alpha 10 [Ad 10]"}, lines(second)); diff != "" || second.Total != 3 {
		t.Errorf("page 2 at 1 a page of %d (-want +got):\n%s", second.Total, diff)
	}
	if got := second.Groups[0].Totals.N; got != 30 {
		t.Errorf("group totals on page 2 = %d, want the whole group's 30", got)
	}
	found := build(t, ranking.Query{Search: "ALP"})
	if diff := cmp.Diff([]string{": Alpha 10 [Ad 10]"}, lines(found)); diff != "" || found.Total != 1 {
		t.Errorf("search ignores case (-want +got):\n%s", diff)
	}
}

func TestParse_EveryProblemAtOnce_040_FR014(t *testing.T) {
	t.Parallel()
	values, _ := url.ParseQuery("sort=name&order=up&group=team&size=7&page=0&drill=bad&q=" + strings.Repeat("x", 101))
	_, err := ranking.Parse(values, []string{"planned"}, ranking.Opening{Sort: "planned", Order: ranking.OrderDesc})

	var e *errs.Error
	if !errors.As(err, &e) || len(e.Fields) != 7 {
		t.Fatalf("Parse = %v, want the seven problems at once", err)
	}
	q, err := ranking.Parse(url.Values{}, []string{"planned"}, ranking.Opening{Sort: "planned", Order: ranking.OrderDesc})
	want := ranking.Query{Sort: "planned", Order: ranking.OrderDesc, Group: ranking.GroupNone, Size: 10, Page: 1}
	if diff := cmp.Diff(want, q); err != nil || diff != "" {
		t.Errorf("Parse with nothing (-want +got):\n%s %v", diff, err)
	}
}

func TestBuild_TotalsCoverEveryPageEachEntryOnce_D414(t *testing.T) {
	t.Parallel()
	for name, q := range map[string]ranking.Query{"ungrouped": {}, "page 2 of 1 a page": {Size: 1, Page: 2},
		"split by Brand": {Group: "attr:SA-1"}, "by owner": {Group: ranking.GroupOwner}} {
		if got := build(t, q).Totals; got != (count{N: 30, Has: true}) {
			t.Errorf("%s: totals %+v, want every entry in view once: Beta 20 + Alpha 10 + Delta 0", name, got)
		}
	}
	if got := build(t, ranking.Query{Search: "alp"}).Totals.N; got != 10 {
		t.Errorf("searched totals = %d, want only Alpha's 10", got)
	}
	if got := build(t, ranking.Query{Drill: "C-2"}).Totals.N; got != 20 {
		t.Errorf("drilled totals = %d, want Beta's 20", got)
	}
}

func TestBuild_TotalsCountAnEntryInTwoGroupsOnce_D414(t *testing.T) {
	t.Parallel()
	both := allwork.AttrValue{OptionIDs: []string{"SO-A", "SO-B"}}
	campaign := allwork.Node{Level: allwork.LevelCampaign, ID: "C-1", ParentID: "P-1", PlanID: "P-1", Name: "Alpha",
		Attrs: map[string]allwork.AttrValue{"SA-1": both}}
	sc := measure.Scope{
		Nodes: []allwork.Node{{Level: allwork.LevelPlan, ID: "P-1", PlanID: "P-1", Name: "Plan one"}, campaign,
			{Level: allwork.LevelActivity, ID: "A-1", ParentID: "C-1", PlanID: "P-1", Name: "Ad"}},
		Matched: allwork.Matched{Plans: []string{"P-1"}, Campaigns: []string{"C-1"}, Activities: []string{"A-1"}},
		Attributes: []allwork.Attribute{{ID: "SA-1", Label: "Brand",
			Options: []allwork.Option{{ID: "SO-A", Label: "Helix"}, {ID: "SO-B", Label: "Pennzoil"}}}},
	}
	x := ranking.NewIndex(sc)
	q := ranking.Query{Sort: "n", Order: ranking.OrderDesc, Group: "attr:SA-1", Page: 1, Size: 10}
	l := ranking.Build(x, "campaign", q, counts{x: x, leaf: map[string]int64{"A-1": 10}})
	if len(l.Groups) != 2 || l.Groups[0].Totals.N != 5 || l.Groups[1].Totals.N != 5 || l.Totals.N != 10 {
		t.Errorf("Alpha under Helix and Pennzoil: %d groups, totals %d; want two groups of 5 (059) and a total of 10",
			len(l.Groups), l.Totals.N)
	}
}
