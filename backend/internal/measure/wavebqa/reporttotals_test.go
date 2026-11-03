package wavebqa_test

import (
	"fmt"
	"maps"
	"net/http"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

func checkTopsEqualSeries(t *testing.T, label string, l listing, s shape) {
	t.Helper()
	if len(l.tops) != l.total {
		t.Fatalf("%s: %d entries on the page of %d, want every entry on one page", label, len(l.tops), l.total)
	}
	tops, groups := add(l.tops...), add(l.sums...)
	if *tops.projected != s.actualOrProjected() || *groups.projected != *tops.projected {
		t.Errorf("%s: top entries' actual or projected %d, group totals %d, want the series' %d", label,
			*tops.projected, *groups.projected, s.actualOrProjected())
	}
	if *tops.actual != s.actualTotal() || *tops.goal != orZero(s.cards.goal) {
		t.Errorf("%s: top entries %s, want the series' actual %d and the goal card %s", label, tops,
			s.actualTotal(), shown(s.cards.goal))
	}
}

func checkGroupsAddUp(t *testing.T, label string, l listing) {
	t.Helper()
	for i, sum := range l.sums {
		var members []figures
		for j, f := range l.tops {
			if l.groupOfTops[j] == i {
				members = append(members, f)
			}
		}
		if got := add(members...); *got.projected != orZero(sum.projected) || *got.goal != orZero(sum.goal) {
			t.Errorf("%s: group %d totals %s, its entries add to %s", label, i, sum, got)
		}
	}
}

func (s shape) goalTotal() int64 {
	var total int64
	for _, p := range s.periods {
		total += orZero(p.goal)
	}
	return total
}

func checkSeriesGoal(t *testing.T, label string, s shape) {
	t.Helper()
	if s.goalTotal() != orZero(s.cards.goal) {
		t.Errorf("%s: the months' goals add to %d, the goal card %s", label, s.goalTotal(), shown(s.cards.goal))
	}
}

// TestWaveB_RankedTotalsEqualSeries_049_SC002: ungrouped top entries add to the series at every level; groups to theirs.
func TestWaveB_RankedTotalsEqualSeries_049_SC002(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, r := range reportsUnderTest() {
		series := r.shapeOf(t, alexSees, "")
		checkSeriesGoal(t, r.name, series)
		for _, plan := range frameOf(t, alexSees, "revenue").planIDs() {
			checkSeriesGoal(t, r.name+" of "+plan, r.shapeOf(t, alexSees, "plan="+plan))
		}
		for _, show := range levels() {
			checkTopsEqualSeries(t, r.name+" at show="+show, r.listOf(t, alexSees, "show="+show), series)
		}
		checkGroupsAddUp(t, r.name+" by plan", r.listOf(t, alexSees, "show=campaign&group=plan"))
	}
}

func monthsProblem(i int, p point) string {
	state := "planned"
	if i < inProgress {
		state = statePast
	} else if i == inProgress {
		state = "inProgress"
	}
	switch {
	case p.key != fmt.Sprintf("2026-%02d", i+1) || p.state != state:
		return "want " + state + ", one of the twelve months of 2026"
	case (p.projected != nil) != (i >= inProgress):
		return "want projected from March on, never before"
	case i > inProgress && p.actual != nil:
		return "want no actual after March"
	}
	return ""
}

func checkMonths(t *testing.T, label string, months shape) {
	t.Helper()
	if len(months.periods) != 12 {
		t.Fatalf("%s: %d months, want 12", label, len(months.periods))
	}
	for i, p := range months.periods {
		if problem := monthsProblem(i, p); problem != "" {
			t.Errorf("%s %s (%s): %s", label, p.key, p.state, problem)
		}
	}
	if got := orZero(months.cards.projected); got != months.actualOrProjected() {
		t.Errorf("%s: actual or projected card %d, want %d: actual to February, projected from March", label, got,
			months.actualOrProjected())
	}
}

// sumOf is a quarter's figure from its months: null only when every month is null.
func sumOf(months []point, pick func(point) *int64) *int64 {
	var total *int64
	for _, m := range months {
		if v := pick(m); v != nil {
			sum := orZero(total) + *v
			total = &sum
		}
	}
	return total
}

func checkQuarters(t *testing.T, label string, months, quarters shape) {
	t.Helper()
	if len(quarters.periods) != 4 || quarters.cards.String() != months.cards.String() {
		t.Fatalf("%s: %d quarters, cards %s; want 4 and the cards of the month view %s", label,
			len(quarters.periods), quarters.cards, months.cards)
	}
	for q, p := range quarters.periods {
		in := months.periods[3*q : 3*q+3]
		want := figures{sumOf(in, func(m point) *int64 { return m.goal }), sumOf(in, func(m point) *int64 { return m.actual }),
			sumOf(in, func(m point) *int64 { return m.projected })}
		wantState := map[bool]string{true: "inProgress", false: "planned"}[q == 0]
		if p.key != fmt.Sprintf("2026-Q%d", q+1) || p.state != wantState || p.String() != want.String() {
			t.Errorf("%s %s (%s): %s, want %s and %s: the sum of its months", label, p.key, p.state, p.figures,
				wantState, want)
		}
	}
}

// TestWaveB_SeriesSplitAtToday_049_FR003_FR004: months split at 12 March; quarters are their months' sums.
func TestWaveB_SeriesSplitAtToday_049_FR003_FR004(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, r := range reportsUnderTest() {
		months := r.shapeOf(t, alexSees, "")
		checkMonths(t, r.name, months)
		checkQuarters(t, r.name, months, r.shapeOf(t, alexSees, "period=quarter"))
	}
}

func categoryIDs(t *testing.T, who person) []string {
	t.Helper()
	list := decode[struct{ Items []category }](t, who.expect(t, get(categoriesPath), http.StatusOK))
	ids := []string{}
	for _, c := range list.Items {
		ids = append(ids, c.ID)
	}
	return ids
}

func checkPartsAddUp(t *testing.T, label string, all shape, parts []shape) {
	t.Helper()
	cards := make([]figures, 0, len(parts))
	for _, p := range parts {
		cards = append(cards, p.cards)
	}
	if got, want := add(cards...), add(all.cards); got.String() != want.String() {
		t.Errorf("%s: the categories' cards add to %s, all categories %s", label, got, want)
	}
	for i, month := range all.periods {
		in := make([]figures, 0, len(parts))
		for _, p := range parts {
			in = append(in, p.periods[i].figures)
		}
		if got, want := add(in...), add(month.figures); got.String() != want.String() {
			t.Errorf("%s %s: the categories add to %s, all categories %s", label, month.key, got, want)
		}
	}
}

func checkEachActivityOnce(t *testing.T, alexSees person, r reportUnderTest, choices []string) {
	t.Helper()
	seen := map[string]int{}
	for _, c := range choices {
		ids := r.listOf(t, alexSees, "show=activity&category="+c).ids
		if c == uncategorised && len(ids) == 0 {
			t.Errorf("%s: no activity uncategorised, want %s's", r.name, uncategorisedType)
		}
		for _, id := range ids {
			seen[id]++
		}
	}
	all := r.listOf(t, alexSees, "show=activity").ids
	if got := slices.Sorted(maps.Keys(seen)); !slices.Equal(got, slices.Sorted(slices.Values(all))) ||
		slices.ContainsFunc(got, func(id string) bool { return seen[id] != 1 }) {
		t.Errorf("%s: the categories list %v, want each of %v exactly once", r.name, seen, all)
	}
}

// TestWaveB_CategoriesLoseNothing_049_FR020: each category plus Uncategorised adds up to all categories, every activity once.
func TestWaveB_CategoriesLoseNothing_049_FR020(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	choices := append(categoryIDs(t, alexSees), uncategorised)
	for _, r := range reportsUnderTest() {
		parts := make([]shape, 0, len(choices))
		for _, c := range choices {
			parts = append(parts, r.shapeOf(t, alexSees, "category="+c))
		}
		checkPartsAddUp(t, r.name, r.shapeOf(t, alexSees, ""), parts)
		checkEachActivityOnce(t, alexSees, r, choices)
	}
}
