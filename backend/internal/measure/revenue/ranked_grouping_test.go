package revenue_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// twoPlanScope is two plans, each with one campaign and one activity with an INQ goal, for T014's grouping
// and drill tests: Launch film (P-1 › C-1 › A-1, owned by Priya) and Relaunch film (P-2 › C-2 › A-2, no
// owner).
func twoPlanScope() measure.Scope {
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	nodes := []allwork.Node{
		{Level: allwork.LevelPlan, ID: "P-1", PlanID: "P-1", Name: "FY2026 Lubricants"},
		{Level: allwork.LevelCampaign, ID: "C-1", PlanID: "P-1", ParentID: "P-1", Name: "Helix launch"},
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", ParentID: "C-1", Name: "Launch film",
			INQ: inqGoal(365_000), Owner: &allwork.Owner{ID: "U-2", Name: "Priya Raman"}, StartDate: &start, EndDate: &end},
		{Level: allwork.LevelPlan, ID: "P-2", PlanID: "P-2", Name: "FY2026 Mobility"},
		{Level: allwork.LevelCampaign, ID: "C-2", PlanID: "P-2", ParentID: "P-2", Name: "Fleet cards"},
		{Level: allwork.LevelActivity, ID: "A-2", PlanID: "P-2", ParentID: "C-2", Name: "Relaunch film",
			INQ: inqGoal(182_500), StartDate: &start, EndDate: &end},
	}
	return measure.Scope{Year: 2026, Nodes: nodes,
		Matched:  allwork.Matched{Plans: []string{"P-1", "P-2"}, Campaigns: []string{"C-1", "C-2"}, Activities: []string{"A-1", "A-2"}},
		Currency: allwork.Currency{Code: "USD"}}
}

func twoPlanGoals() fakeGoals {
	return fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}, "A-2": revenue.ActivityGoals{Model: lubricantsModel()}}
}

func TestRankedRevenue_GroupsByPlanWithGroupTotals_FR005_T014(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "campaign"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Group: "plan", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if len(got.Groups) != 2 {
		t.Fatalf("groups = %d, want one per plan", len(got.Groups))
	}
	for _, g := range got.Groups {
		if len(g.Entries) != 1 {
			t.Fatalf("group %q entries = %d, want 1", g.Label, len(g.Entries))
		}
		if g.Totals.Projected == nil || g.Totals.Projected.Amount.Cents() != centsOf(g.Entries[0].Figures.Projected) {
			t.Errorf("group %q totals.projected = %v, want the one entry's own figure", g.Label, g.Totals.Projected)
		}
	}
}

func centsOf(m *money.Money) int64 {
	if m == nil {
		return 0
	}
	return m.Amount.Cents()
}

func TestRankedRevenue_GroupsByOwnerAndLabelsNoOwner_FR005_T014(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Group: "owner", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	var sawOwned, sawNoOwner bool
	for _, g := range got.Groups {
		switch g.Label {
		case "Priya Raman":
			sawOwned = true
		case "No owner":
			sawNoOwner = true
		}
	}
	if !sawOwned || !sawNoOwner {
		t.Errorf("groups = %+v, want one labelled Priya Raman and one No owner", got.Groups)
	}
}

func TestRankedRevenue_DrillShowsOneRecordWithItsTrail_FR005_T014(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "campaign"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Drill: "C-1", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if got.Total != 1 || len(got.Groups) != 1 || len(got.Groups[0].Entries) != 1 {
		t.Fatalf("ranked = %+v, want the one drilled campaign", got)
	}
	entry := got.Groups[0].Entries[0]
	if entry.ID != "C-1" {
		t.Errorf("entry id = %q, want C-1", entry.ID)
	}
	wantChildIDs := []string{"A-1"}
	if diff := cmp.Diff(wantChildIDs, childIDsOf(entry)); diff != "" {
		t.Errorf("children (-want +got):\n%s", diff)
	}
	wantTrailIDs := []string{"P-1", "C-1"}
	if diff := cmp.Diff(wantTrailIDs, trailIDsOf(got.Trail)); diff != "" {
		t.Errorf("trail (-want +got):\n%s", diff)
	}
}

func childIDsOf(e revenue.RevenueEntry) []string {
	ids := make([]string, len(e.Children))
	for i, c := range e.Children {
		ids[i] = c.ID
	}
	return ids
}

func trailIDsOf(trail []revenue.TrailStep) []string {
	ids := make([]string, len(trail))
	for i, t := range trail {
		ids[i] = t.ID
	}
	return ids
}

func TestRankedRevenue_DrillingIntoAHiddenRecordFallsBackAndSaysSo_FR005_T014(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "campaign"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Drill: "X-9999", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if !got.DrillLost {
		t.Error("drillLost = false, want true: the drilled record is not in view")
	}
	if got.Total != 2 {
		t.Errorf("total = %d, want the full campaign list, not an empty one", got.Total)
	}
}

func TestRankedFunnel_GroupsByPlanAndDrillsWithTrail_FR005_T014(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)

	grouped, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "campaign"},
		revenue.RankedQuery{Sort: revenue.SortProjected, Order: revenue.OrderDesc, Group: "plan", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	if len(grouped.Groups) != 2 {
		t.Fatalf("groups = %d, want one per plan", len(grouped.Groups))
	}

	drilled, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "campaign"},
		revenue.RankedQuery{Sort: revenue.SortProjected, Order: revenue.OrderDesc, Drill: "C-2", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	if drilled.Total != 1 || drilled.Groups[0].Entries[0].ID != "C-2" {
		t.Fatalf("drilled = %+v, want the one drilled campaign C-2", drilled)
	}
	if len(drilled.Trail) != 2 || drilled.Trail[1].ID != "C-2" {
		t.Errorf("trail = %+v, want plan then C-2", drilled.Trail)
	}
}

func TestRankedRevenue_AttributeSplitSharesTheFigureAcrossItsGroups_D270_T014(t *testing.T) {
	t.Parallel()
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	sixty, forty := money.PercentFromHundredths(6000), money.PercentFromHundredths(4000)
	nodes := []allwork.Node{
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end,
			Attrs: map[string]allwork.AttrValue{
				"AT-1": {OptionIDs: []string{"O-1", "O-2"}, Shares: map[string]money.Percent{"O-1": sixty, "O-2": forty}},
			}},
	}
	sc := measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Activities: []string{"A-1"}},
		Attributes: []allwork.Attribute{{ID: "AT-1", Label: "Region", Options: []allwork.Option{{ID: "O-1", Label: "EMEA"}, {ID: "O-2", Label: "APAC"}}}},
		Currency:   allwork.Currency{Code: "USD"}}
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Group: "attr:AT-1", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if len(got.Groups) != 2 {
		t.Fatalf("groups = %d, want one per option (EMEA, APAC)", len(got.Groups))
	}
	var total int64
	for _, g := range got.Groups {
		if g.Label != "EMEA" && g.Label != "APAC" {
			t.Errorf("group label = %q, want EMEA or APAC", g.Label)
		}
		total += g.Totals.Projected.Amount.Cents()
	}
	whole := revenueReportFixture(t).Cards.Projected.Value.Amount.Cents()
	if total != whole {
		t.Errorf("groups' totals sum to %d cents, want %d: a %% split must add back to the whole", total, whole)
	}
}

func TestRankedRevenue_EntriesWithoutTheSortFigureSortLast_FR005_T014(t *testing.T) {
	t.Parallel()
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	nodes := []allwork.Node{
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end},
		{Level: allwork.LevelActivity, ID: "A-2", PlanID: "P-1", Name: "No goal set"},
	}
	sc := measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Activities: []string{"A-1", "A-2"}},
		Currency: allwork.Currency{Code: "USD"}}
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	entries := got.Groups[0].Entries
	if len(entries) != 2 || entries[0].ID != "A-1" || entries[1].ID != "A-2" {
		t.Fatalf("entries = %+v, want A-1 (has a figure) before A-2 (none)", entries)
	}
}
