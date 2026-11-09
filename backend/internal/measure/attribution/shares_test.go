package attribution_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
)

func stepsOn(ids []string, days []int) []attribution.Touch {
	out := make([]attribution.Touch, len(ids))
	for i := range ids {
		out[i] = attribution.Touch{ActivityID: ids[i], Date: day(days[i])}
	}
	return out
}

func shown2(shares []attribution.Share) []string {
	out := make([]string, 0, len(shares))
	for _, s := range shares {
		out = append(out, s.ActivityID+" "+s.Date.String()+" "+s.Amount.String())
	}
	return out
}

func TestShares_PerStep_FiveModels_058_FR009(t *testing.T) {
	t.Parallel()
	journey := attribution.Conversion{ActivityID: "A-9", Date: day(25), Revenue: money.FromCents(100_000), Journey: true,
		Touches: stepsOn([]string{"A-1", "A-2", "A-3"}, []int{1, 10, 20})}
	want := map[attribution.Model][]string{
		attribution.FirstTouch:  {"1000.00", "0.00", "0.00"},
		attribution.LastTouch:   {"0.00", "0.00", "1000.00"},
		attribution.Equal:       {"333.33", "333.33", "333.34"},
		attribution.LinearDecay: {"166.66", "333.33", "500.01"},
		attribution.UShaped:     {"400.00", "200.00", "400.00"},
	}
	for m, amounts := range want {
		var got []string
		for _, s := range attribution.Shares(journey, m) {
			got = append(got, s.Amount.String())
		}
		if diff := cmp.Diff(amounts, got); diff != "" {
			t.Errorf("%s shares per step (-want +got):\n%s", m, diff)
		}
	}

	twice := journey
	twice.Touches = stepsOn([]string{"A-1", "A-1", "A-2"}, []int{1, 10, 20})
	shares := attribution.Shares(twice, attribution.Equal)
	credits := attribution.Attribute(twice, attribution.Equal)
	if len(shares) != 3 || len(credits) != 2 || credits[0].Amount.String() != "666.66" || credits[1].Amount.String() != "333.34" {
		t.Errorf("two steps on A-1: shares %v, credits %v; want three shares and A-1 666.66, A-2 333.34", shown2(shares), credits)
	}
}

func TestShares_LeftoverToLatestLargest_058_R7(t *testing.T) {
	t.Parallel()
	c := attribution.Conversion{ActivityID: "A-9", Date: day(25), Revenue: money.FromCents(100_001), Journey: true,
		Touches: stepsOn([]string{"A-1", "A-2", "A-3", "A-4"}, []int{1, 5, 10, 20})}

	var got []string
	for _, s := range attribution.Shares(c, attribution.UShaped) {
		got = append(got, s.Amount.String())
	}
	if diff := cmp.Diff([]string{"400.00", "100.00", "100.00", "400.01"}, got); diff != "" {
		t.Errorf("U-shaped 1,000.01 over four steps, the cent to the latest of the two largest (-want +got):\n%s", diff)
	}
}

func TestSteps_SameDayByActivityID_058_R5(t *testing.T) {
	t.Parallel()
	c := attribution.Conversion{ActivityID: "A-9", Date: day(25), Revenue: money.FromCents(100_000), Journey: true,
		Touches: stepsOn([]string{"A-2", "A-1"}, []int{10, 10})}

	got := shown2(attribution.Shares(c, attribution.LastTouch))
	want := []string{"A-1 2026-03-10 0.00", "A-2 2026-03-10 1000.00"}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("same-day steps given out of order (-want +got):\n%s", diff)
	}
}

func TestConvert_DealsAddUpToActual_058_FR010(t *testing.T) {
	t.Parallel()
	settings, _ := settingsService(t)
	facts := factStore{conversions: []attribution.RevenueFact{
		revenue("A-6", 6, in("EUR", 5), ""), revenue("A-6", 7, in("EUR", 5), ""), revenue("A-6", 40, in("EUR", 5), ""),
	}}
	rates := rateTable{"USD": money.RateFromMicros(1_000_000), "EUR": money.RateFromMicros(920_000)}
	c := attribution.NewCrediting(settings, facts, rates)

	got, err := c.Credit(t.Context(), authz.Scope{Everything: true}, []string{"A-6"}, 2026)
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}
	// 0.05 EUR alone is 0.05 USD, but 0.10 EUR is 0.11: March's two deals convert as parts of their month's
	// total (0.05 + 0.06), as 049's Actual does; April's converts alone.
	if got.ByActivity["A-6"].String() != "0.16" {
		t.Errorf("credited %s, want 0.16: the deals of one activity, month and currency add up to Actual", got.ByActivity["A-6"])
	}
}
