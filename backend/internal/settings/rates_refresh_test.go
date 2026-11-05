package settings

import (
	"testing"
	"time"

	"mapp/internal/history"
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

func TestListCurrentRates_AsOfIsTheNewestStoredChangeNotTheStart_Issue183(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	f.clock.now = october20.Add(15 * time.Minute)
	if _, err := f.service.RefreshRates(t.Context(), alex); err != nil {
		t.Fatalf("RefreshRates() error = %v", err)
	}
	refreshedAt := f.clock.now
	f.clock.now = refreshedAt.Add(2 * time.Hour)

	s := f.service
	restarted := NewService(history.Tools{Tx: s.tx, IDs: s.ids, Log: s.history, Now: s.now}, s.repo)
	page, err := restarted.ListCurrentRates(t.Context(), alex)

	if err != nil || !page.AsOf.Equal(refreshedAt) {
		t.Errorf("as of after a restart = %v, %v, want the stored refresh %v", page.AsOf, err, refreshedAt)
	}
}

func TestListCurrentRates_AsOfFollowsAnImportAndAHandEnteredRate_Issue183(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	f.clock.now = october20.Add(time.Hour)
	rows := []FeedRow{{Row: 1, RateType: sampleRateType, From: "USD", To: "EUR", ValidFrom: "2026-10-20", Rate: "0.987654"}}
	if _, err := f.service.ApplyRateRows(t.Context(), alex, "file", "gsap_rates.csv", rows); err != nil {
		t.Fatalf("ApplyRateRows() error = %v", err)
	}
	imported, _ := f.service.ListCurrentRates(t.Context(), alex)
	f.clock.now = october20.Add(2 * time.Hour)
	if _, err := f.service.AddRate(t.Context(), alex, "GBP", RateInput{Date: "2026-10-21", Rate: "0.81"}); err != nil {
		t.Fatalf("AddRate() error = %v", err)
	}
	entered, _ := f.service.ListCurrentRates(t.Context(), alex)

	if !imported.AsOf.Equal(october20.Add(time.Hour)) || !entered.AsOf.Equal(f.clock.now) {
		t.Errorf("as of = %v after the import, %v after the rate entry; want %v and %v",
			imported.AsOf, entered.AsOf, october20.Add(time.Hour), f.clock.now)
	}
}

func TestRefreshRates_RepeatWithinTheMinuteSucceedsAndSavesNothing_Issue183(t *testing.T) {
	t.Parallel()
	f := feedFixture(t)
	f.clock.now = october20.Add(15 * time.Minute)
	first, err := f.service.RefreshRates(t.Context(), alex)
	if err != nil {
		t.Fatalf("RefreshRates() error = %v", err)
	}
	imports, _ := f.service.repo.ListRateImports(t.Context())
	logged := len(f.logEntries(t))
	f.clock.now = f.clock.now.Add(20 * time.Second)

	again, err := f.service.RefreshRates(t.Context(), alex)

	if err != nil {
		t.Fatalf("repeat RefreshRates() error = %v, want the current rates", err)
	}
	if !again.AsOf.Equal(f.clock.now) {
		t.Errorf("as of = %v, want the repeat's time %v", again.AsOf, f.clock.now)
	}
	if ratePage(t, again, "EUR").Rate != ratePage(t, first, "EUR").Rate {
		t.Errorf("EUR moved on a repeat within the minute")
	}
	if after, _ := f.service.repo.ListRateImports(t.Context()); len(after) != len(imports) {
		t.Errorf("imports = %d, want %d: a repeat saves no import", len(after), len(imports))
	}
	if n := len(f.logEntries(t)); n != logged {
		t.Errorf("%d new log entries, want none", n-logged)
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
