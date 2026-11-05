package settings

import "testing"

func TestRefreshRates_MovesTodaysRatesAndSetsAsOf_Demo183(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	before, _ := f.service.Rates(t.Context())
	empty, err := f.service.ListCurrentRates(t.Context(), alex)
	if err != nil || empty.AsOf != nil {
		t.Fatalf("before any refresh AsOf = %v, %v; want nil", empty.AsOf, err)
	}

	done, err := f.service.RefreshRates(t.Context(), alex)

	if err != nil || done.Feed != simulatedFeedName || done.Added+done.Replaced != 2 {
		t.Fatalf("RefreshRates = %+v, %v; want one rate each for EUR and GBP", done, err)
	}
	after, _ := f.service.Rates(t.Context())
	if after["EUR"] == before["EUR"] || after["GBP"] == before["GBP"] {
		t.Errorf("rates after = %v, before = %v; want every rate moved", after, before)
	}
	page, err := f.service.ListCurrentRates(t.Context(), alex)
	if err != nil || page.AsOf == nil || !page.AsOf.Equal(f.clock.now) {
		t.Errorf("AsOf = %v, %v; want the refresh time %v", page.AsOf, err, f.clock.now)
	}
}

func TestRefreshRates_NextQuarterHourMovesAgain_Demo183(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	if _, err := f.service.RefreshRates(t.Context(), alex); err != nil {
		t.Fatalf("first refresh: %v", err)
	}
	first, _ := f.service.Rates(t.Context())

	f.clock.now = f.clock.now.Add(RateRefreshEvery)
	_, err := f.service.RefreshRates(t.Context(), alex)

	second, _ := f.service.Rates(t.Context())
	if err != nil || second["EUR"] == first["EUR"] {
		t.Errorf("second refresh = %v, rates %v then %v; want them moved", err, first["EUR"], second["EUR"])
	}
}
