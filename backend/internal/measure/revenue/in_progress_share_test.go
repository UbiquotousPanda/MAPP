package revenue_test

import (
	"testing"
	"time"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// 13 November: 18 of November's 30 days are left, today included.
var midNovember = time.Date(2026, 11, 13, 9, 0, 0, 0, time.UTC)

// typedScope is the lineage example: a typed 5,000.00 over the whole year projects 410.96 in November and 424.66 in
// December; facts reach 2,133.33 by October and 200.00 so far in November. A-2 has no goal and 100.00 in November.
func typedScope(withUnprojected bool) (measure.Scope, fakeGoals, []revenue.FactTotal) {
	start, end := date.MustParse("2026-01-01"), date.MustParse("2026-12-31")
	inq, mql, goal := int64(1_000), int64(100), money.FromCents(500_000)
	a := allwork.Node{Level: allwork.LevelActivity, ID: "A-1", PlanID: "P-1", Name: "Search", StartDate: &start,
		EndDate: &end, Status: "approved", INQ: &inq, MQL: &mql, Revenue: &goal}
	sc := measure.Scope{Year: 2026, Nodes: []allwork.Node{a}, Matched: allwork.Matched{Activities: []string{"A-1"}},
		Currency: allwork.Currency{Code: "USD"}}
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel(), SetLaterStagesMyself: true}}
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-01", Currency: "USD", AmountMinor: 100_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", AmountMinor: 83_333, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-03", Currency: "USD", AmountMinor: 30_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-11", Currency: "USD", AmountMinor: 20_000, FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-01", Counts: 50, FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-11", Counts: 40, FactCount: 1},
	}
	if withUnprojected {
		b := allwork.Node{Level: allwork.LevelActivity, ID: "A-2", PlanID: "P-1", Name: "Booth", Status: "approved"}
		sc.Nodes, sc.Matched.Activities = append(sc.Nodes, b), append(sc.Matched.Activities, "A-2")
		facts = append(facts, revenue.FactTotal{ActivityID: "A-2", Stage: "revenue", Month: "2026-11", Currency: "USD",
			AmountMinor: 10_000, FactCount: 1})
	}
	return sc, goals, facts
}

func TestActualOrProjected_TheMonthInProgressIsItsActualPlusTheDaysLeftOfItsProjection_047_D426(t *testing.T) {
	t.Parallel()
	eur, _ := money.ParseRate("0.9")
	for _, c := range []struct {
		name           string
		unprojected    bool
		currency       allwork.Currency
		want, wantList int64
	}{
		{"USD", false, allwork.Currency{Code: "USD"}, 300_457, 300_457},
		{"with an activity that projects nothing", true, allwork.Currency{Code: "USD"}, 310_457, 300_457},
		{"EUR", false, allwork.Currency{Code: "EUR", Rate: eur}, 270_411, 270_411},
	} {
		sc, goals, facts := typedScope(c.unprojected)
		sc.Currency = c.currency
		s := newFixtureAt(midNovember, sc, goals, facts)
		for _, period := range bothPeriods {
			f := measure.Filter{Period: period, Show: measure.ShowActivity}
			report := revenueIn(t, s, period)
			list, err := s.RankedRevenue(t.Context(), priya, f, revenue.RankedQuery{Sort: revenue.SortGoal,
				Order: revenue.OrderDesc, Size: 10, Page: 1})
			if err != nil {
				t.Fatalf("RankedRevenue: %v", err)
			}
			var row *money.Money
			for _, e := range list.Groups[0].Entries {
				if e.ID == "A-1" {
					row = e.Figures.Projected
				}
			}
			if got := centsOf(report.Cards.Projected.Value); got != c.want || centsOf(row) != c.wantList {
				t.Errorf("%s %s: card %d, A-1's row %v, want %d and %d cents", c.name, period, got, row, c.want, c.wantList)
			}
		}
	}
}

// INQ: 50 by October, 40 so far in November; the typed 1,000 projects 83 in November and 85 in December.
func TestActualOrProjected_CountsShareTheMonthInProgressTheSameWay_047_D426(t *testing.T) {
	t.Parallel()
	sc, goals, facts := typedScope(false)
	s := newFixtureAt(midNovember, sc, goals, facts)
	for _, period := range bothPeriods {
		f := measure.Filter{Period: period, Show: measure.ShowActivity}
		report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageINQ)
		if err != nil {
			t.Fatalf("FunnelReport: %v", err)
		}
		const want = 50 + 40 + 50 + 85
		if v := report.Cards.Projected.Value; v == nil || *v != want {
			t.Errorf("%s: INQ actual or projected = %v, want %v (83 × 18 ÷ 30 = 49.8 rounds to 50)", period, deref(v), want)
		}
	}
}
