package revenue_test

import (
	"net/url"
	"testing"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

func TestRankedRevenue_ListTotalsAreTheCardsOnEveryPage_039_FR035(t *testing.T) {
	t.Parallel()
	sc := twoPlanScope()
	rate, _ := money.ParseRate("0.92")
	sc.Currency = allwork.Currency{Code: "EUR", Rate: rate}
	s := newFixtureWith(sc, twoPlanGoals(), nil)
	f := measure.Filter{Show: measure.ShowCampaign}
	report, err := s.Report(t.Context(), priya, f)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	for _, q := range []revenue.RankedQuery{{Size: 10, Page: 2}, {Group: "plan", Size: 10, Page: 1}} {
		q.Sort, q.Order = revenue.SortProjectedRevenue, revenue.OrderDesc
		list, err := s.RankedRevenue(t.Context(), priya, f, q)
		if err != nil {
			t.Fatalf("RankedRevenue: %v", err)
		}
		got := list.Totals
		if got.Projected == nil || got.Projected.Currency != "EUR" ||
			got.Projected.Amount.Cents() != report.Cards.Projected.Value.Amount.Cents() ||
			(got.Performance == nil) != (report.Cards.Performance.Value == nil) {
			t.Errorf("%+v: totals %v at %v, want the cards' %v at %v", q, got.Projected, got.Performance,
				report.Cards.Projected.Value, report.Cards.Performance.Value)
		}
	}
}

func TestRankedFunnel_ListTotalsAreTheCards_039_FR035(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)
	f := measure.Filter{Show: measure.ShowCampaign}
	report, err := s.FunnelReport(t.Context(), priya, f, revenue.StageINQ)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	list, err := s.RankedFunnel(t.Context(), priya, f, revenue.RankedQuery{Sort: revenue.SortProjected,
		Order: revenue.OrderDesc, Group: "plan", Size: 10, Page: 1, Stage: revenue.StageINQ})
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}
	assertSameFigure(t, "Goal", report.Cards.Goal.Value, float64(*list.Totals.Goal))
	assertSameFigure(t, "Projected", report.Cards.Projected.Value, float64(*list.Totals.Projected))
	assertSameFigure(t, "Performance", report.Cards.Performance.Value, *list.Totals.Performance)
}

func TestRankedSheets_EndWithTheListTotal_039_FR035(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoPlanGoals(), nil)
	f := measure.Filter{Show: measure.ShowCampaign, Own: url.Values{"group": {"plan"}}}
	list, err := s.RankedRevenue(t.Context(), priya, f, revenue.RankedQuery{Sort: revenue.SortProjectedRevenue,
		Order: revenue.OrderDesc, Group: "plan", Size: 10, Page: 1})
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	revenueSheets, err := revenue.NewRevenueReport(s).Sheets(t.Context(), priya, f)
	if err != nil {
		t.Fatalf("revenue Sheets: %v", err)
	}
	funnelSheets, err := revenue.NewFunnelReport(s).Sheets(t.Context(), priya, f)
	if err != nil {
		t.Fatalf("funnel Sheets: %v", err)
	}
	for name, rows := range map[string][][]sheet.Cell{"revenue": revenueSheets[2].Sheet.Rows, "funnel": funnelSheets[2].Sheet.Rows} {
		if len(rows) != 6 || rows[5][0] != sheet.Bold("Total") {
			t.Errorf("%s: %d rows ending %v, want heading, both campaigns with their activity, then Total", name,
				len(rows), rows[len(rows)-1])
		}
	}
	if got := revenueSheets[2].Sheet.Rows[5][5]; got != sheet.Money(list.Totals.Projected.Amount) {
		t.Errorf("revenue Total projected = %v, want the list's %v", got, list.Totals.Projected)
	}
}
