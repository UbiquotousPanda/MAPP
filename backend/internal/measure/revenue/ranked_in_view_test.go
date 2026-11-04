package revenue_test

import (
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
)

// filteredToFirstPlan keeps twoPlanScope's records but filters the view to P-1, where C-1 also holds A-3 (filtered
// out) and A-4 (in view, twice A-1's goal, listed after it).
func filteredToFirstPlan() measure.Scope {
	sc := twoPlanScope()
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	sc.Nodes = append(sc.Nodes,
		allwork.Node{Level: allwork.LevelActivity, ID: "A-3", PlanID: "P-1", ParentID: "C-1", Name: "Filtered out",
			INQ: inqGoal(900_000), StartDate: &start, EndDate: &end},
		allwork.Node{Level: allwork.LevelActivity, ID: "A-4", PlanID: "P-1", ParentID: "C-1", Name: "Banner",
			INQ: inqGoal(730_000), StartDate: &start, EndDate: &end})
	sc.Matched = allwork.Matched{Plans: []string{"P-1"}, Campaigns: []string{"C-1"}, Activities: []string{"A-1", "A-4"}}
	return sc
}

func TestRanked_EntriesAndChildrenComeOnlyFromWhatIsInViewChildrenSorted_FR005_FR006_4a(t *testing.T) {
	t.Parallel()
	goals := twoPlanGoals()
	goals["A-3"], goals["A-4"] = goals["A-1"], goals["A-1"]
	s := newFixtureWith(filteredToFirstPlan(), goals, nil)
	q := revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1}

	revenueList, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "campaign"}, q)
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	q.Sort = revenue.SortProjected
	funnelList, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "campaign"}, q)
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	for name, got := range map[string][]string{
		"revenue": entryAndChildIDs(revenueList.Total, revenueList.Groups[0].Entries[0].ID, childIDsOf(revenueList.Groups[0].Entries[0])),
		"funnel":  entryAndChildIDs(funnelList.Total, funnelList.Groups[0].Entries[0].ID, funnelChildIDs(funnelList)),
	} {
		if diff := cmp.Diff([]string{"total 1", "C-1", "A-4", "A-1"}, got); diff != "" {
			t.Errorf("%s: only C-1 in view, its children in view ranked by projected (-want +got):\n%s", name, diff)
		}
	}
}

func entryAndChildIDs(total int, id string, children []string) []string {
	return append([]string{fmt.Sprint("total ", total), id}, children...)
}

func funnelChildIDs(list revenue.FunnelRanked) []string {
	var ids []string
	for _, c := range list.Groups[0].Entries[0].Children {
		ids = append(ids, c.ID)
	}
	return ids
}
