package summary

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
	"mapp/internal/platform/sheet"
)

// A-1's goal is set to what its months place in the year, 12 x 800.00, so the card and the table agree.
func withYearGoal() *fakes {
	f := newFakes()
	f.series[0].Goal.RevenueUSD = ptr(money.FromCents(960_000))
	return f
}

func TestTrendTotals_EachColumnOverTheYearSameInMonthsAndQuarters_039_FR035(t *testing.T) {
	t.Parallel()
	// Actual: A-1 5 x 100.00 + June's 50.00, A-2 200.00; projected: June to December, 7 x 100.00.
	want := TrendTotals{Actual: usd(75_000), Projected: usd(70_000), Goal: usd(960_000)}
	for _, period := range []string{measure.PeriodMonth, measure.PeriodQuarter} {
		got := report(t, withYearGoal(), measure.Filter{Period: period}).Revenue
		if diff := cmp.Diff(want, got.TrendTotals, amounts()); diff != "" {
			t.Errorf("%s: trend totals (-want +got)\n%s", period, diff)
		}
		if got.Goal == nil || got.TrendTotals.Goal.Amount.Cmp(got.Goal.Amount) != 0 {
			t.Errorf("%s: Goal total %v, want the Revenue goal card %v", period, got.TrendTotals.Goal, got.Goal)
		}
	}
}

func TestTrendTotals_ConvertedOnceInTheDisplayCurrency_039_FR035(t *testing.T) {
	t.Parallel()
	f := withYearGoal()
	rate, _ := money.ParseRate("0.92")
	f.scope.Currency = allwork.Currency{Code: "EUR", Rate: rate}

	got := report(t, f, measure.Filter{Period: measure.PeriodQuarter}).Revenue
	eur := func(cents int64) *money.Money {
		m := money.Money{Amount: money.FromCents(cents), Currency: "EUR"}
		return &m
	}
	want := TrendTotals{Actual: eur(69_000), Projected: eur(64_400), Goal: eur(883_200)}
	if diff := cmp.Diff(want, got.TrendTotals, amounts()); diff != "" {
		t.Errorf("trend totals (-want +got)\n%s", diff)
	}
	if got.TrendTotals.Goal.Amount.Cmp(got.Goal.Amount) != 0 {
		t.Errorf("Goal total %v, want the card %v", got.TrendTotals.Goal, got.Goal)
	}
}

func TestTrendTotals_AColumnWithoutAFigureIsNull_039_FR035(t *testing.T) {
	t.Parallel()
	f := newFakes()
	f.series = []revenue.ActivitySeries{unprojected("A-2", planTwo)}

	got := report(t, f, measure.Filter{}).Revenue.TrendTotals
	if !cmp.Equal(TrendTotals{Actual: usd(20_000)}, got, amounts()) {
		t.Errorf("trend totals = %+v, want 200.00 actual and no projection or goal", got)
	}
	rows := trendSheet(report(t, f, measure.Filter{}).Revenue, money.BaseCurrency).Rows
	last := rows[len(rows)-1]
	if last[0] != sheet.Bold("Total") || last[3] != sheet.Text(dash) || last[4] != sheet.Text(dash) {
		t.Errorf("export ends %v, want the Total line with — for Projected and Goal", last)
	}
}
