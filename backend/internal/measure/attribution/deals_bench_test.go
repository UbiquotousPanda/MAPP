package attribution_test

import (
	"fmt"
	"testing"
	"time"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
)

// benchStore is the busiest activity at the 028 volume: concerned in 500 deals of six steps each, one of them its
// own, booked on fifty other activities in USD and EUR.
func benchStore(deals int) dealStore {
	calls := 0
	store := dealStore{calls: &calls}
	for _, id := range activityIDs(51) {
		store.names = append(store.names, attribution.ActivityName{ID: id, Name: "Activity " + id, Status: "approved", PlanID: "P-1", PlanName: "Plan"})
	}
	for i := range deals {
		ref := fmt.Sprintf("J-%d", i)
		currency := "USD"
		if i%3 == 0 {
			currency = "EUR"
		}
		store.facts.conversions = append(store.facts.conversions, attribution.RevenueFact{ID: fmt.Sprintf("PF-%d", i),
			Reference: fmt.Sprintf("R-%d", i), ActivityID: fmt.Sprintf("A-%d", i%50+2), Date: date.New(2026, time.Month(i%12+1), 28),
			Revenue: in(currency, int64(i+1)*1_000), JourneyRef: ref})
		for s := range 6 {
			activity := fmt.Sprintf("A-%d", (i+s)%50+2)
			if s == 2 {
				activity = "A-1"
			}
			store.facts.touches = append(store.facts.touches, step(ref, activity, date.New(2026, time.Month(i%12+1), s*4+1), "inq"))
		}
	}
	return store
}

func BenchmarkDeals_058_FR025(b *testing.B) {
	f := dealsOn(b, benchStore(500))
	ctx := withPermissions(authz.ReportsView)
	q := attribution.DealsQuery{ActivityID: "A-1", Year: 2026, Page: 1}
	for b.Loop() {
		if _, err := f.deals.Of(ctx, alex, q); err != nil {
			b.Fatal(err)
		}
	}
}
