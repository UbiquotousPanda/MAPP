package revenue_test

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/sheet"
)

func TestRevenueReport_SheetsExportEveryWidget_FR007(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	sheets, err := revenue.NewRevenueReport(s).Sheets(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Sheets: %v", err)
	}
	var got []string
	for _, sh := range sheets {
		got = append(got, sh.Key+" "+sh.Sheet.Name)
	}
	want := []string{"cards Cards", "periods Periods", "ranked Ranked list"}
	if len(got) != len(want) {
		t.Fatalf("sheets = %v, want %v", got, want)
	}
	for i, w := range want {
		if got[i] != w {
			t.Errorf("sheets[%d] = %q, want %q", i, got[i], w)
		}
	}
	// Cards: Figure/Value header + goal, actual, projected, performance.
	if len(sheets[0].Sheet.Rows) != 5 {
		t.Errorf("cards rows = %d, want 5 (header + 4 figures)", len(sheets[0].Sheet.Rows))
	}
	checkPeriodsEndWithTotals(t, sheets[1].Sheet.Rows)
}

// The fixture's model carries part of the goal past December, so the Total line is followed by that part.
func checkPeriodsEndWithTotals(t *testing.T, periods [][]sheet.Cell) {
	t.Helper()
	if len(periods) != 15 || periods[13][0] != sheet.Bold("Total") || periods[14][0] != sheet.Text(revenue.LabelGoalAfterYear) {
		t.Errorf("periods rows = %d ending %v, want 15: header, 12 months, the Total line, then the goal after December",
			len(periods), periods[len(periods)-1])
	}
}

func TestFunnelReport_SheetsExportEveryWidget_FR007(t *testing.T) {
	t.Parallel()
	sc := oneActivityScope()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureWith(sc, goals, nil)

	sheets, err := revenue.NewFunnelReport(s).Sheets(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Sheets: %v", err)
	}
	var got []string
	for _, sh := range sheets {
		got = append(got, sh.Key+" "+sh.Sheet.Name)
	}
	want := []string{"cards Cards", "periods Periods", "ranked Ranked list"}
	if len(got) != len(want) {
		t.Fatalf("sheets = %v, want %v", got, want)
	}
	for i, w := range want {
		if got[i] != w {
			t.Errorf("sheets[%d] = %q, want %q", i, got[i], w)
		}
	}
}
