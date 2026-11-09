package revenue_test

import (
	"context"
	"net/url"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/sheet"
)

type fakeDealSheets struct {
	asked []attribution.DealsQuery
}

func (f *fakeDealSheets) Sheet(_ context.Context, _ actor.Actor, q attribution.DealsQuery) (sheet.Sheet, error) {
	f.asked = append(f.asked, q)
	return sheet.Sheet{Name: "Deals", Rows: [][]sheet.Cell{{sheet.Bold("Deal")}}}, nil
}

func (f *fakeDealSheets) Describe(_ context.Context, _ actor.Actor, q attribution.DealsQuery) ([][2]string, error) {
	f.asked = append(f.asked, q)
	return [][2]string{{"Deals of", "Tellus webinar series"}}, nil
}

func TestRevenueReport_SheetsAddTheDealsWidgetForAnActivity_058_FR023(t *testing.T) {
	t.Parallel()
	deals := &fakeDealSheets{}
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := revenue.NewService(fakeTx{}, revenue.Deps{
		Scoper: fakeScoper{scope: oneActivityScope()}, Facts: fakeFacts{}, Goals: goals,
		Categories: fakeCategories{}, Rates: fakeRates{}, Credits: fakeReturns{}, Spending: fakeReturns{}, Deals: deals,
	}, func() time.Time { return noon })
	report := revenue.NewRevenueReport(s)
	own := url.Values{"activity": {"A-1"}, "compare": {"lastTouch"}}

	sheets, err := report.Sheets(t.Context(), priya, measure.Filter{Own: own, Currency: "EUR", Query: allwork.Query{Year: 2026}})
	if err != nil {
		t.Fatalf("Sheets: %v", err)
	}
	if len(sheets) != 4 || sheets[3].Key != "deals" {
		t.Fatalf("%d sheets, last %q; want the three widgets and deals", len(sheets), sheets[len(sheets)-1].Key)
	}
	want := attribution.DealsQuery{ActivityID: "A-1", Year: 2026, Currency: "EUR", Compare: attribution.LastTouch}
	if diff := cmp.Diff(want, deals.asked[0]); diff != "" {
		t.Errorf("the deals read asked for (-want +got):\n%s", diff)
	}

	plain, err := report.Sheets(t.Context(), priya, measure.Filter{})
	if err != nil || len(plain) != 3 {
		t.Errorf("without an activity: %d sheets, %v; want the three widgets only", len(plain), err)
	}
	notes, err := report.(measure.Described).Describe(t.Context(), priya, own)
	if err != nil || notes[len(notes)-1] != [2]string{"Deals of", "Tellus webinar series"} {
		t.Errorf("notes = %v, %v; want the deals widget's note last", notes, err)
	}
}
