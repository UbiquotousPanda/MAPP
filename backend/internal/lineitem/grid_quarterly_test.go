package lineitem

import (
	"slices"
	"testing"

	"mapp/internal/platform/money"
)

// A quarter adds up its months in the plan currency, outside the activity's dates only when all of them are.
func TestQuarterly_AddsUpMonthsByQuarter_FR020(t *testing.T) {
	t.Parallel()
	launch := newFakeActivities().facts[launchFilm] // Mar–May 2026
	items := []LineItem{
		lineItem("100.00", SpreadEvenly),
		lineItem("300.00", SpreadCustom, "2026-02", "100.00", "2026-04", "100.00", "2026-08", "100.00"),
	}
	views := []View{viewOf("A", "item", items[0], launch, money.One), viewOf("B", "item", items[1], launch, money.One)}

	q := Quarterly(Grid(launch, views))

	if got := columnKeys(q); !slices.Equal(got, []string{"2026-Q1", "2026-Q2", "2026-Q3!"}) {
		t.Errorf("columns = %v", got)
	}
	if got := cellTexts(q.Totals); !slices.Equal(got, []string{"133.33", "166.67", "100.00"}) {
		t.Errorf("totals = %v", got)
	}
	if got := cellTexts(q.Rows[1].Cells); !slices.Equal(got, []string{"100.00", "100.00", "100.00"}) {
		t.Errorf("custom row = %v", got)
	}
	if q.Total.Format() != "400.00 USD" || q.Columns[0].Quarter == nil || *q.Columns[0].Quarter != "2026-Q1" {
		t.Errorf("total = %v, first quarter = %v", q.Total, q.Columns[0].Quarter)
	}
}
