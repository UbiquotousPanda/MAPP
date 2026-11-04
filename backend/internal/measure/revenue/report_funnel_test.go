package revenue_test

import (
	"slices"
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
)

func TestFunnelReport_SelectsTheFirstAvailableStageAndCountsUncovered_FR015_049C11(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if got.Stage != revenue.StageINQ {
		t.Errorf("stage = %q, want inq, the first the model allows", got.Stage)
	}
	if len(got.AvailableStages) != 2 {
		t.Errorf("availableStages = %v, want inq and mql", got.AvailableStages)
	}
	if got.UncoveredCount != 0 {
		t.Errorf("uncoveredCount = %d, want 0: the one plan in view is covered", got.UncoveredCount)
	}
}

// Both models project INQ and MQL, but the selector offers only what a goal may be set against.
func TestFunnelReport_TheSelectorListsTheStagesTheModelsAllow_FR015_049C11_049C12(t *testing.T) {
	t.Parallel()
	cases := map[string]struct {
		p1, p2 []string
		want   []string
	}{
		"one model allows only MQL":      {p1: []string{"revenue", "mql"}, p2: []string{"revenue"}, want: []string{"mql"}},
		"the union in funnel order":      {p1: []string{"mql"}, p2: []string{"inq"}, want: []string{"inq", "mql"}},
		"no model allows a funnel stage": {p1: []string{"revenue"}, p2: []string{"revenue"}, want: []string{}},
		"deals is never offered":         {p1: []string{"deals", "mql"}, p2: []string{"mql"}, want: []string{"mql"}},
	}
	for name, c := range cases {
		goals := fakeGoals{
			"A-1": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: c.p1},
			"A-2": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: c.p2},
		}
		got, err := newFixtureWith(twoPlansScope(), goals, nil).FunnelReport(t.Context(), priya, measure.Filter{}, "")
		if err != nil {
			t.Fatalf("%s: FunnelReport: %v", name, err)
		}
		if !slices.Equal(got.AvailableStages, c.want) {
			t.Errorf("%s: availableStages = %v, want %v", name, got.AvailableStages, c.want)
		}
		if len(c.want) > 0 && got.Stage != c.want[0] {
			t.Errorf("%s: stage = %q, want %q, the first allowed", name, got.Stage, c.want[0])
		}
	}
}

func twoPlansScope() measure.Scope {
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	nodes := []allwork.Node{
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Launch film",
			INQ: inqGoal(365_000), StartDate: &start, EndDate: &end},
		{Level: allwork.LevelActivity, ID: "A-2", PlanID: "P-2", Name: "Direct deal",
			INQ: inqGoal(500), StartDate: &start, EndDate: &end},
	}
	return measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Activities: []string{"A-1", "A-2"}},
		Currency: allwork.Currency{Code: "USD"}}
}

// P-2's model allows only INQ goals, so P-2 is uncovered for MQL while P-1's model still offers it.
func TestFunnelReport_AModelThatDoesNotAllowTheStageIsUncovered_FR018(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{
		"A-1": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: []string{"inq", "mql", "revenue"}},
		"A-2": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: []string{"inq"}},
	}
	s := newFixtureWith(twoPlansScope(), goals, nil)

	got, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "mql")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if got.Stage != revenue.StageMQL {
		t.Fatalf("stage = %q, want mql: P-1's model still offers it", got.Stage)
	}
	if got.UncoveredCount != 1 {
		t.Errorf("uncoveredCount = %d, want 1: P-2's model does not allow MQL", got.UncoveredCount)
	}
}

func TestFunnelReport_APlanWithoutGoalsIsNotUncoveredWhenItsModelAllowsTheStage_FR018_049C11(t *testing.T) {
	t.Parallel()
	sc := twoPlansScope()
	sc.Nodes[1].INQ = nil
	allowed := []string{"inq", "mql", "revenue"}
	goals := fakeGoals{
		"A-1": revenue.ActivityGoals{Model: lubricantsModel(), AllowedStages: allowed},
		"A-2": revenue.ActivityGoals{Model: lubricantsModel(), SetLaterStagesMyself: true, AllowedStages: allowed},
	}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "mql")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if got.UncoveredCount != 0 {
		t.Errorf("uncoveredCount = %d, want 0: P-2 has no goal, but its model allows MQL", got.UncoveredCount)
	}
}

func TestRankedRevenue_SortsByProjectedByDefault(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"}, revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	if got.Total != 1 || len(got.Groups) != 1 || len(got.Groups[0].Entries) != 1 {
		t.Fatalf("ranked = %+v, want the one activity in view", got)
	}
	if got.Groups[0].Entries[0].ID != "A-1" {
		t.Errorf("entry id = %q, want A-1", got.Groups[0].Entries[0].ID)
	}
}

// With no grouping, the ranked list's one top-level group totals the same actual, projected and goal as
// the report's own cards, for the same filter.
func TestRankedRevenue_TopLevelTotalsMatchTheSeriesTotals_SC002(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	report, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	ranked, err := s.RankedRevenue(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	totals := ranked.Groups[0].Totals
	if totals.Goal == nil || report.Cards.Goal.Value == nil || totals.Goal.Amount.Cents() != report.Cards.Goal.Value.Amount.Cents() {
		t.Errorf("ranked goal total = %v, want the report's own goal card %v", totals.Goal, report.Cards.Goal.Value)
	}
	if totals.Projected == nil || report.Cards.Projected.Value == nil ||
		totals.Projected.Amount.Cents() != report.Cards.Projected.Value.Amount.Cents() {
		t.Errorf("ranked projected total = %v, want the report's own projected card %v", totals.Projected, report.Cards.Projected.Value)
	}
}

// A real defect: ranked rows never carried Projected or
// Performance, so every one answered "—" for both regardless of real data.
func TestRankedFunnel_EntriesCarryProjectedAndPerformance_FR012_FR017(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	got, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Sort: revenue.SortProjected, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	entry := got.Groups[0].Entries[0]
	if entry.Figures.Projected == nil {
		t.Fatalf("entry projected = %+v, want a value: the activity has a goal and a model", entry.Figures)
	}
	if entry.Figures.Performance == nil {
		t.Errorf("entry performance = %+v, want a value computed from projected ÷ goal", entry.Figures)
	}
}

// Every ranked Funnel entry carries Conversion, not just the report's own cards.
func TestRankedFunnel_EntryCarriesConversionFromThePreviousStage_FR017_T057(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "inq", Month: "2026-02", Counts: 1000, FactCount: 1},
		{ActivityID: "A-1", Stage: "mql", Month: "2026-02", Counts: 25, FactCount: 1},
	}
	s := newFixtureWith(sc, goals, facts)

	got, err := s.RankedFunnel(t.Context(), priya, measure.Filter{Show: "activity"},
		revenue.RankedQuery{Stage: "mql", Sort: revenue.SortActual, Order: revenue.OrderDesc, Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	entry := got.Groups[0].Entries[0]
	if entry.Figures.Conversion == nil {
		t.Fatalf("entry conversion = %+v, want a value: both stages have counted facts", entry.Figures)
	}
	if *entry.Figures.Conversion != 2.5 {
		t.Errorf("entry conversion = %v, want 2.5 %% (25 of 1,000, one decimal), matching the report's own card", *entry.Figures.Conversion)
	}
	if got.Groups[0].Totals.Conversion == nil || *got.Groups[0].Totals.Conversion != 2.5 {
		t.Errorf("group totals conversion = %v, want 2.5 %%", got.Groups[0].Totals.Conversion)
	}
}

func TestConversionCard_WithPreviousActualComputesOneDecimal_FR017(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "inq", Month: "2026-02", Counts: 1000, FactCount: 1},
		{ActivityID: "A-1", Stage: "mql", Month: "2026-02", Counts: 25, FactCount: 1},
	}
	s := newFixtureWith(sc, goals, facts)

	got, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "mql")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if got.Cards.Conversion.Value == nil {
		t.Fatalf("conversion = %+v, want a value: both stages have counted facts", got.Cards.Conversion)
	}
	if *got.Cards.Conversion.Value != 2.5 {
		t.Errorf("conversion = %v, want 2.5 %% (25 of 1,000, one decimal)", *got.Cards.Conversion.Value)
	}
}
