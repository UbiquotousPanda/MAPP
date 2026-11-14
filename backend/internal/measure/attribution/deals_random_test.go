package attribution_test

import (
	"fmt"
	"testing"
	"time"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

func TestDeals_AddUpToTheList_058_FR011(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, randomStore(50))
	ctx := withPermissions(authz.ReportsView)
	list, err := attribution.NewCrediting(f.settings, f.store, f.rates).Credit(ctx, authz.ScopeOf(ctx), activityIDs(6), 2026)
	if err != nil || len(list.ByActivity) < 3 {
		t.Fatalf("Credit = %d activities, %v; want at least three to prove anything", len(list.ByActivity), err)
	}
	for id, credited := range list.ByActivity {
		for _, currency := range []string{"", "EUR"} {
			f.checkAddsUp(t, id, credited, currency)
		}
	}
	f.checkStepsAddUp(t, "A-1")
}

// checkAddsUp proves the panel's shares add up to its total, and the total to the ranked list's credit as the
// display currency converts it; the deals booked on the activity convert as Actual does.
func (f dealsFixture) checkAddsUp(t *testing.T, id string, credited money.Amount, currency string) {
	t.Helper()
	display := money.DisplayIn(currency, "0.92")
	panel := f.allPages(t, attribution.DealsQuery{ActivityID: id, Currency: currency})
	var shares, booked money.Amount
	for _, d := range panel.Deals {
		shares = shares.Add(d.Share.Amount)
		if d.BookedOn.ID == id {
			booked = booked.Add(d.USD.Amount)
		}
	}
	got := fmt.Sprintf("shares %s panel %s booked %s", shares, moneyText(&panel.Credited), moneyText(panel.Booked))
	wantBooked := display.Money(money.USD(booked))
	want := fmt.Sprintf("shares %s panel %s booked %s", panel.Credited.Amount, moneyText(&panel.Credited), moneyText(&wantBooked))
	if panel.Booked == nil {
		want = fmt.Sprintf("shares %s panel %s booked none", panel.Credited.Amount, moneyText(&panel.Credited))
	}
	if list := display.Money(money.USD(credited)); got != want || panel.Credited != list {
		t.Errorf("%s in %q: %s; want %s, the list's %s", id, currency, got, want, moneyText(&list))
	}
}

func (f dealsFixture) checkStepsAddUp(t *testing.T, id string) {
	t.Helper()
	for _, d := range f.allPages(t, attribution.DealsQuery{ActivityID: id}).Deals {
		var sum money.Amount
		for _, s := range d.Steps {
			sum = sum.Add(s.Share.Amount)
		}
		if d.Journey == attribution.JourneyShared && sum != d.USD.Amount {
			t.Errorf("deal %s: its steps' shares add up to %s, the deal is %s", d.ID, sum, d.USD.Amount)
		}
	}
}

func activityIDs(n int) []string {
	out := make([]string, 0, n)
	for i := range n {
		out = append(out, fmt.Sprintf("A-%d", i+1))
	}
	return out
}

type lcg uint64

func (g *lcg) next(n int) int {
	*g = *g*6364136223846793005 + 1442695040888963407
	return int(uint64(*g>>33) % uint64(n)) //nolint:gosec // G115: a bounded index, never negative
}

// randomStore gives six activities n deals from a fixed seed: USD or EUR, with or without a journey, whose steps
// may fall before or after the deal.
func randomStore(n int) dealStore {
	g := lcg(58_2026)
	calls := 0
	store := dealStore{calls: &calls}
	for _, id := range activityIDs(6) {
		store.names = append(store.names, attribution.ActivityName{ID: id, Name: "Activity " + id, Status: "approved", PlanID: "P-1", PlanName: "Plan"})
	}
	for i := range n {
		currency := "USD"
		if g.next(10) < 3 {
			currency = "EUR"
		}
		f := attribution.RevenueFact{ID: fmt.Sprintf("PF-%d", i), Reference: fmt.Sprintf("R-%d", i), ActivityID: fmt.Sprintf("A-%d", g.next(6)+1),
			Date: date.New(2026, time.Month(g.next(12)+1), g.next(28)+1), Revenue: in(currency, int64(g.next(10_000_000)+1))}
		if g.next(10) < 6 {
			f.JourneyRef = fmt.Sprintf("J-%d", i)
			for range g.next(4) + 1 {
				store.facts.touches = append(store.facts.touches, step(f.JourneyRef, fmt.Sprintf("A-%d", g.next(6)+1),
					date.New(2026, time.Month(g.next(12)+1), g.next(28)+1), "inq"))
			}
		}
		store.facts.conversions = append(store.facts.conversions, f)
	}
	return store
}
