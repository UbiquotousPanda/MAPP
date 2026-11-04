package plan

import (
	"maps"
	"testing"
)

func TestOwnMissing_CountsWhatTheListShows_043_132(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.putDemoPlans(t)
	bare := seedPlan(t, planSeed{"P-1004", "FY2026 Owner elsewhere", 2026, teamMobility, priya.ID, "", StatusDraft})
	bare.GoalStage, bare.Attributes = "", nil
	f.put(t, bare)

	listed, err := f.service.List(t.Context(), priya, ListFilter{Scope: ScopeAll, Year: ptr(2026)})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	got, err := f.service.OwnMissing(t.Context(), priya, 2026)
	if err != nil {
		t.Fatalf("OwnMissing: %v", err)
	}

	want := map[string]int{}
	for _, item := range listed.Items {
		want[item.ID] = len(item.Completeness.Missing)
	}
	if want["P-1004"] < 3 {
		t.Fatalf("the bare plan misses %d fields, want its owner, goal stage and attributes", want["P-1004"])
	}
	if !maps.Equal(want, got) {
		t.Errorf("OwnMissing = %v, want the Plans list's own missing counts %v, 2027's plan left out", got, want)
	}
}
