package revenue_test

import (
	"slices"
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/measure/revenue"
)

// twoPlansOfTwoCategories: P-1's C-1 holds the Asset activity A-1, C-2 the Promo A-2; P-2's C-3 holds the Promo A-3.
func twoPlansOfTwoCategories() *revenue.Service {
	activity := func(id, parent, plan, activityType string) allwork.Node {
		return allwork.Node{Level: allwork.LevelActivity, ID: id, ParentID: parent, PlanID: plan, Name: id,
			INQ: inqGoal(1000), ActivityTypeID: activityType}
	}
	nodes := []allwork.Node{
		{Level: allwork.LevelPlan, ID: "P-1", PlanID: "P-1", Name: "P-1"},
		{Level: allwork.LevelPlan, ID: "P-2", PlanID: "P-2", Name: "P-2"},
		{Level: allwork.LevelCampaign, ID: "C-1", ParentID: "P-1", PlanID: "P-1", Name: "C-1"},
		{Level: allwork.LevelCampaign, ID: "C-2", ParentID: "P-1", PlanID: "P-1", Name: "C-2"},
		{Level: allwork.LevelCampaign, ID: "C-3", ParentID: "P-2", PlanID: "P-2", Name: "C-3"},
		activity("A-1", "C-1", "P-1", "AT-Asset"), activity("A-2", "C-2", "P-1", "AT-Promo"),
		activity("A-3", "C-3", "P-2", "AT-Promo"),
	}
	sc := measure.Scope{Year: 2026, Nodes: nodes, Currency: allwork.Currency{Code: "USD"},
		Matched: allwork.Matched{Plans: []string{"P-1", "P-2"}, Campaigns: []string{"C-1", "C-2", "C-3"},
			Activities: []string{"A-1", "A-2", "A-3"}}}
	goals := fakeGoals{}
	for _, id := range sc.Matched.Activities {
		goals[id] = revenue.ActivityGoals{Model: lubricantsModel()}
	}
	categories := fakeCategories{{ID: "CAT-1", Name: "Asset", ActivityTypeIDs: []string{"AT-Asset"}}}
	return newFixtureWithCategories(sc, goals, categories)
}

func rankedIDs[F any](list ranking.List[F]) []string {
	ids := []string{}
	for _, g := range list.Groups {
		for _, e := range g.Entries {
			ids = append(ids, e.ID)
		}
	}
	return ids
}

func TestRanked_ACategoryListsOnlyTheRecordsHoldingOneOfItsActivities_FR019_US3(t *testing.T) {
	t.Parallel()
	s := twoPlansOfTwoCategories()
	for show, want := range map[string][]string{"plan": {"P-1"}, "campaign": {"C-1"}} {
		f := measure.Filter{Show: show, Own: queryWith("category", "CAT-1")}
		q := revenue.RankedQuery{Stage: revenue.StageINQ, Size: 10, Page: 1}
		r, err := s.RankedRevenue(t.Context(), priya, f, q)
		if err != nil {
			t.Fatalf("RankedRevenue: %v", err)
		}
		funnel, err := s.RankedFunnel(t.Context(), priya, f, q)
		if err != nil {
			t.Fatalf("RankedFunnel: %v", err)
		}
		if r.Total != len(want) || !slices.Equal(rankedIDs(r.List), want) {
			t.Errorf("Revenue at show=%s: %d entries %v, want %v: only records with an Asset activity", show, r.Total,
				rankedIDs(r.List), want)
		}
		if funnel.Total != len(want) || !slices.Equal(rankedIDs(funnel), want) {
			t.Errorf("Funnel stages at show=%s: %d entries %v, want %v", show, funnel.Total, rankedIDs(funnel), want)
		}
	}
}
