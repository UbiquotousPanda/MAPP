package settings

import (
	"testing"
	"time"

	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

func ratePage(t *testing.T, page CurrentRatePage, code string) RateInfo {
	t.Helper()
	for _, info := range page.Items {
		if info.Currency == code {
			return info
		}
	}
	t.Fatalf("no rate for %s in %+v", code, page.Items)
	return RateInfo{}
}

func TestRefreshRates_SavesTodaysRatesAndMovesAsOf_Demo10(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	before, err := f.service.ListCurrentRates(t.Context(), alex)
	if err != nil {
		t.Fatalf("ListCurrentRates() error = %v", err)
	}
	f.clock.now = october20.Add(15 * time.Minute)

	after, err := f.service.RefreshRates(t.Context(), alex)

	if err != nil {
		t.Fatalf("RefreshRates() error = %v", err)
	}
	if !after.AsOf.Equal(f.clock.now) || after.AsOf.Equal(before.AsOf) {
		t.Errorf("as of = %v, want the refresh time %v (was %v)", after.AsOf, f.clock.now, before.AsOf)
	}
	for _, code := range []string{"EUR", "GBP", "INR"} {
		was, now := ratePage(t, before, code), ratePage(t, after, code)
		moved := now.Rate.Micros() - was.Rate.Micros()
		limit := was.Rate.Micros() * maxDriftBasisPoints / basisPointsPerUnit
		if moved == 0 || moved > limit || moved < -limit || *now.RateDate != date.MustParse("2026-10-20") || *now.Source != RateGSAPImport {
			t.Errorf("%s moved %d (limit ±%d), now %v on %v from %v", code, moved, limit, now.Rate, now.RateDate, now.Source)
		}
	}
	if usd := ratePage(t, after, money.BaseCurrency); !usd.Rate.IsOne() || usd.RateDate != nil {
		t.Errorf("USD = %+v, want 1 without a date", usd)
	}
}

func TestListCurrentRates_AsOfStartsAtTheStartTime_Demo10(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)

	page, err := f.service.ListCurrentRates(t.Context(), alex)

	if err != nil || !page.AsOf.Equal(start) {
		t.Errorf("as of = %v, %v, want the start time %v", page.AsOf, err, start)
	}
}

func TestSimulatedRows_RepeatableAndNeverStandStill_Demo10(t *testing.T) {
	t.Parallel()
	rate, _ := money.ParseRate("0.92")
	day := date.MustParse("2026-10-20")
	rateDate := day
	infos := []RateInfo{
		{Currency: "USD", Rate: money.One},
		{Currency: "EUR", Rate: rate, RateDate: &rateDate},
	}

	first := simulatedRows(infos, day, october20)
	again := simulatedRows(infos, day, october20.Add(30*time.Second))

	if len(first) != 1 || first[0].To != "EUR" || first[0].Rate == "0.92" || len(again) != 1 || again[0] != first[0] {
		t.Errorf("rows = %+v then %+v, want one moved EUR row, the same within a minute", first, again)
	}
	for minute := range 1000 {
		if drift := driftBasisPoints("EUR" + string(rune('a'+minute%26)) + time.Duration(minute).String()); drift == 0 ||
			drift > maxDriftBasisPoints || drift < -maxDriftBasisPoints {
			t.Fatalf("drift = %d, want -50..50 and never 0", drift)
		}
	}
}

func TestRefreshRates_StayNearTheRateTheyStartedFromAllDay_Demo10(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	before, err := f.service.ListCurrentRates(t.Context(), alex)
	if err != nil {
		t.Fatalf("ListCurrentRates() error = %v", err)
	}
	var after CurrentRatePage
	for tick := 1; tick <= 32; tick++ {
		f.clock.now = october20.Add(time.Duration(tick) * 15 * time.Minute)
		if after, err = f.service.RefreshRates(t.Context(), alex); err != nil {
			t.Fatalf("RefreshRates() tick %d error = %v", tick, err)
		}
	}

	for _, code := range []string{"EUR", "GBP", "INR"} {
		was, now := ratePage(t, before, code), ratePage(t, after, code)
		moved := now.Rate.Micros() - was.Rate.Micros()
		if limit := was.Rate.Micros() * maxDriftBasisPoints / basisPointsPerUnit; moved > limit || moved < -limit {
			t.Errorf("%s moved %d after a day of refreshes, want within ±%d of %v", code, moved, limit, was.Rate)
		}
	}
}
