package plan

import "testing"

func TestWaterfallUSD_IsThePlanPagesGoals_048_FR020(t *testing.T) {
	t.Parallel()
	m := model(t, "2.00", "5.00", "10000.00")
	p := Plan{GoalStage: StageINQ, GoalAmount: "250000"}

	got := WaterfallUSD(p, m)

	page := goalsOf(p, m, GoalTotals{}, usdConverter).Plan
	if got.INQ == nil || *got.INQ != *page.INQ || *got.MQL != *page.MQL || *got.Deals != *page.Deals {
		t.Errorf("WaterfallUSD() = %+v, want the plan page's %+v", got, page)
	}
	if got.Revenue == nil || got.Revenue.Format() != "2,500,000.00 USD" {
		t.Errorf("WaterfallUSD() revenue = %v, want 2,500,000.00 USD", got.Revenue)
	}
}
