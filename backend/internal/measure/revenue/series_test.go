package revenue_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
)

func seriesOf(t *testing.T, s *revenue.Service, category string) []revenue.ActivitySeries {
	t.Helper()
	got, err := s.ActivitySeries(t.Context(), priya, measure.Filter{}, category)
	if err != nil {
		t.Fatalf("ActivitySeries: %v", err)
	}
	return got
}

func idsOfSeries(series []revenue.ActivitySeries) []string {
	ids := make([]string, len(series))
	for i, a := range series {
		ids[i] = a.ID
	}
	return ids
}

func TestActivitySeries_GivesEachMonthItsActualProjectedAndGoal_048C10_FR021_FR022(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 500_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-02", Counts: 1_000, FactCount: 1},
	}
	got := seriesOf(t, newFixtureWith(oneActivityScope(), goals, facts), "")
	if len(got) != 1 || len(got[0].Months) != 12 {
		t.Fatalf("series = %+v, want one activity with the plan year's 12 months", got)
	}
	a := got[0]
	wantOwn := []string{"365000", "7300", "365000000", "true", "Lubricants 1.0", "[inq mql]"}
	gotOwn := []string{shown(a.Goal.INQ), shown(a.Goal.MQL), shown(centsPtr(a.Goal.RevenueUSD)),
		fmt.Sprint(a.HasProjection), a.ModelName, fmt.Sprint(a.Stages)}
	if diff := cmp.Diff(wantOwn, gotOwn); diff != "" {
		t.Errorf("own goals and model (-want +got):\n%s", diff)
	}
	// Each figure reads actual / projected / goal; the fixed clock sits in July.
	want := []string{
		"2026-02 actual inq 1000/—/28000 mql —/—/620 usd 500000/—/0",
		"2026-07 inProgress inq 0/31000/31000 mql —/600/600 usd 0/30000000/30000000",
		"2026-12 planned inq —/31000/31000 mql —/600/600 usd —/30000000/30000000",
	}
	var gotMonths []string
	for _, i := range []int{1, 6, 11} {
		gotMonths = append(gotMonths, monthShown(a.Months[i]))
	}
	if diff := cmp.Diff(want, gotMonths); diff != "" {
		t.Errorf("months (-want +got):\n%s", diff)
	}
}

func monthShown(m revenue.Month) string {
	usd := revenue.Figure[int64]{Actual: centsPtr(m.RevenueUSD.Actual), Projected: centsPtr(m.RevenueUSD.Projected),
		Goal: centsPtr(m.RevenueUSD.Goal)}
	return fmt.Sprintf("%s %s inq %s mql %s usd %s", m.Key, m.State, figureShown(m.INQ), figureShown(m.MQL),
		figureShown(usd))
}

func figureShown(f revenue.Figure[int64]) string {
	return shown(f.Actual) + "/" + shown(f.Projected) + "/" + shown(f.Goal)
}

func shown(v *int64) string {
	if v == nil {
		return "—"
	}
	return fmt.Sprint(*v)
}

func centsPtr(a *money.Amount) *int64 {
	if a == nil {
		return nil
	}
	c := a.Cents()
	return &c
}

func TestActivitySeries_GoalMonthsPlaceTheGoalInTheYear_048C10_049C16(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	a := seriesOf(t, newFixtureWith(oneActivityScope(), goals, nil), "")[0]

	var inq int64
	var usd money.Amount
	for _, m := range a.Months {
		inq += *m.INQ.Goal
		usd = usd.Add(*m.RevenueUSD.Goal)
	}
	if inq != 365_000 {
		t.Errorf("INQ goal months add up to %d, want the whole 365,000 phased over the year", inq)
	}
	// Deals land two months after their MQL, so what lands after December drops out of the year.
	if usd.Cents() != 273_000_000 {
		t.Errorf("revenue goal months add up to %s, want 2,730,000.00 within the year", usd)
	}
}

func TestActivitySeries_CategoryNarrowsTheActivities_048C10_049C10(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}, "A-2": revenue.ActivityGoals{Model: lubricantsModel()}}
	categories := fakeCategories{{ID: "CAT-1", Name: "Asset", ActivityTypeIDs: []string{"AT-Asset"}}}
	s := newFixtureWithCategories(twoCategoryScope(), goals, categories)

	for category, want := range map[string][]string{"": {"A-1", "A-2"}, "CAT-1": {"A-1"}, "uncategorised": {"A-2"}} {
		if diff := cmp.Diff(want, idsOfSeries(seriesOf(t, s, category))); diff != "" {
			t.Errorf("category %q (-want +got):\n%s", category, diff)
		}
	}
}

// askedFacts remembers which activities the facts read was asked for.
type askedFacts struct {
	fakeFacts
	asked []string
}

func (f *askedFacts) ReportTotals(ctx context.Context, scope authz.Scope, ids []string, year int) ([]revenue.FactTotal, error) {
	f.asked = append(f.asked, ids...)
	return f.fakeFacts.ReportTotals(ctx, scope, ids, year)
}

func TestActivitySeries_LeavesOutAnActivityOutsideTheScope_048C10_FR002(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	sc.Nodes = append(sc.Nodes, allwork.Node{Level: allwork.LevelActivity, ID: "A-9", PlanID: "P-9", Name: "Elsewhere"})
	facts := &askedFacts{fakeFacts: fakeFacts{rows: []revenue.FactTotal{
		{ActivityID: "A-9", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 900_000, FactCount: 1},
	}}}
	s := revenue.NewService(fakeTx{}, revenue.Deps{Scoper: fakeScoper{scope: sc}, Facts: facts,
		Goals: fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}, Categories: fakeCategories{}, Rates: fakeRates{}},
		func() time.Time { return noon })

	got := seriesOf(t, s, "")
	if diff := cmp.Diff([]string{"A-1"}, idsOfSeries(got)); diff != "" {
		t.Errorf("activities (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff([]string{"A-1"}, facts.asked); diff != "" {
		t.Errorf("facts asked for (-want +got):\n%s", diff)
	}
}

func TestActivitySeries_CarriesWhatSummaryGroupsBy_048C4_048C10(t *testing.T) {
	t.Parallel()
	yes := true
	region := allwork.AttrValue{OptionIDs: []string{"O-EMEA"}}
	nodes := []allwork.Node{
		{Level: allwork.LevelPlan, ID: "P-1", PlanID: "P-1", TeamIDs: []string{"T-1"},
			Attrs: map[string]allwork.AttrValue{"AT-Region": region, "AT-Brand": {OptionIDs: []string{"O-Plan"}}}},
		{Level: allwork.LevelCampaign, ID: "C-1", PlanID: "P-1", ParentID: "P-1",
			Attrs: map[string]allwork.AttrValue{"AT-Brand": {OptionIDs: []string{"O-Helix"}}}},
		{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", ParentID: "C-1", Name: "Launch film",
			ActivityTypeID: "AT-Video", Owner: &allwork.Owner{ID: "U-2", Name: "Priya Raman"},
			Attrs: map[string]allwork.AttrValue{"AT-Digital": {Yes: &yes}, "AT-Empty": {}}},
	}
	sc := measure.Scope{Year: 2026, Nodes: nodes, Matched: allwork.Matched{Plans: []string{"P-1"},
		Campaigns: []string{"C-1"}, Activities: []string{"A-1"}}, Currency: allwork.Currency{Code: "USD"}}
	a := seriesOf(t, newFixtureWith(sc, fakeGoals{}, nil), "")[0]

	want := map[string]allwork.AttrValue{"AT-Region": region, "AT-Brand": {OptionIDs: []string{"O-Helix"}},
		"AT-Digital": {Yes: &yes}}
	if diff := cmp.Diff(want, a.Attributes); diff != "" {
		t.Errorf("attributes, the nearest value winning (-want +got):\n%s", diff)
	}
	if a.PlanID != "P-1" || a.ActivityTypeID != "AT-Video" || a.Owner.ID != "U-2" || !cmp.Equal(a.TeamIDs, []string{"T-1"}) {
		t.Errorf("series = %+v, want its plan, type, owner and the plan's team", a)
	}
	if a.HasProjection || len(a.Stages) != 0 || a.Months[11].INQ.Goal != nil {
		t.Errorf("series = %+v, want no projection: the activity has no goal", a)
	}
}

func TestActivitySeries_SumsToTheRevenueCards_048C10_SC002(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}, "A-2": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := append(julyAndAugustFacts("revenue", 1_000_000, 500_000), revenue.FactTotal{ActivityID: "A-2",
		Stage: "revenue", Month: "2026-03", Currency: "USD", AmountMinor: 250_000, FactCount: 1})
	sc := twoPlanScope()
	for i, n := range sc.Nodes {
		if n.Level == allwork.LevelActivity {
			sc.Nodes[i] = withGoalsAsShown(n)
		}
	}
	s := newFixtureAt(midAugust, sc, goals, facts)
	var goal, actual, total money.Amount
	for _, a := range seriesOf(t, s, "") {
		goal = goal.Add(*a.Goal.RevenueUSD)
		for _, m := range a.Months {
			actual, total = addSeriesMonth(m, actual, total)
		}
	}
	for _, period := range bothPeriods {
		report, err := s.Report(t.Context(), priya, measure.Filter{Period: period})
		if err != nil {
			t.Fatalf("%s: Report: %v", period, err)
		}
		cards := report.Cards
		got := []int64{cards.Goal.Value.Amount.Cents(), cards.Actual.Value.Amount.Cents(), cards.Projected.Value.Amount.Cents()}
		if diff := cmp.Diff([]int64{goal.Cents(), actual.Cents(), total.Cents()}, got); diff != "" {
			t.Errorf("%s: cards goal, actual, projected vs the summed series (-want +got):\n%s", period, diff)
		}
	}
}

// addSeriesMonth adds a month's actual so far, and its actual or projected: actual once past, projected otherwise.
func addSeriesMonth(m revenue.Month, actual, total money.Amount) (money.Amount, money.Amount) {
	f := m.RevenueUSD
	if f.Actual != nil {
		actual = actual.Add(*f.Actual)
	}
	if m.State == revenue.StatePast && f.Actual != nil {
		return actual, total.Add(*f.Actual)
	}
	if f.Projected != nil {
		total = total.Add(*f.Projected)
	}
	return actual, total
}

func TestActivitySeries_CountsTheRevenueFactsLeftOutForWantOfARate_FR024_046C7(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 500_000, FactCount: 2},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-03", Currency: "EUR", AmountMinor: 900_000, FactCount: 3},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-04", Currency: "JPY", AmountMinor: 100, FactCount: 1},
	}

	got := seriesOf(t, newFixtureWith(oneActivityScope(), goals, facts), "")

	if len(got) != 1 || got[0].ExcludedFacts != 4 {
		t.Fatalf("series = %+v, want 4 facts left out: 3 in EUR and 1 in JPY have no rate", got)
	}
}
