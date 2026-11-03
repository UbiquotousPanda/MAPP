package attribution_test

import (
	"context"
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
)

type factStore struct {
	conversions []attribution.RevenueFact
	touches     []attribution.JourneyTouch
}

func (f factStore) Conversions(_ context.Context, _ authz.Scope, activityIDs []string, _ int) ([]attribution.RevenueFact, error) {
	journeys := f.journeysOf(activityIDs)
	var out []attribution.RevenueFact
	for _, c := range f.conversions {
		if slices.Contains(activityIDs, c.ActivityID) || slices.Contains(journeys, c.JourneyRef) {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f factStore) journeysOf(activityIDs []string) []string {
	var refs []string
	for _, t := range f.touches {
		if slices.Contains(activityIDs, t.ActivityID) {
			refs = append(refs, t.JourneyRef)
		}
	}
	for _, c := range f.conversions {
		if c.JourneyRef != "" && slices.Contains(activityIDs, c.ActivityID) {
			refs = append(refs, c.JourneyRef)
		}
	}
	return refs
}

func (f factStore) Touches(_ context.Context, _ authz.Scope, refs []string) ([]attribution.JourneyTouch, error) {
	var out []attribution.JourneyTouch
	for _, t := range f.touches {
		if slices.Contains(refs, t.JourneyRef) {
			out = append(out, t)
		}
	}
	return out, nil
}

type rateTable money.Rates

func (r rateTable) Rates(context.Context) (money.Rates, error) { return money.Rates(r), nil }

func revenue(activityID string, d int, amount money.Money, ref string) attribution.RevenueFact {
	return attribution.RevenueFact{ActivityID: activityID, Date: day(d), JourneyRef: ref,
		Revenue: amount}
}

func in(currency string, cents int64) money.Money {
	return money.Money{Amount: money.FromCents(cents), Currency: currency}
}

func touch(ref, activityID string, d int) attribution.JourneyTouch {
	return attribution.JourneyTouch{JourneyRef: ref, Touch: attribution.Touch{ActivityID: activityID, Date: day(d)}}
}

// demoFacts: a 1,000 USD conversion on A-9 after three touches; 500 USD and 200 EUR without a journey; 90 USD
// whose only touch came after it; 100 GBP, which has no rate.
var demoFacts = factStore{
	conversions: []attribution.RevenueFact{
		revenue("A-9", 25, in("USD", 100_000), "J-1"), revenue("A-5", 5, in("USD", 50_000), ""),
		revenue("A-6", 6, in("EUR", 20_000), ""), revenue("A-8", 25, in("USD", 9_000), "J-2"),
		revenue("A-7", 7, in("GBP", 10_000), ""),
	},
	touches: []attribution.JourneyTouch{
		touch("J-1", "A-1", 1), touch("J-1", "A-2", 10), touch("J-1", "A-3", 20), touch("J-2", "A-1", 30),
	},
}

var everyActivity = []string{"A-1", "A-2", "A-3", "A-5", "A-6", "A-7", "A-8", "A-9"}

func crediting(t *testing.T) (*attribution.Crediting, *attribution.Service) {
	t.Helper()
	settings, _ := settingsService(t)
	rates := rateTable{"USD": money.RateFromMicros(1_000_000), "EUR": money.RateFromMicros(500_000)}
	return attribution.NewCrediting(settings, demoFacts, rates), settings
}

func shown(c attribution.Credited) map[string]string {
	out := map[string]string{"unattributed": c.Unattributed.String()}
	for id, amount := range c.ByActivity {
		out[id] = amount.String()
	}
	return out
}

func TestCrediting_ReadsConversionsAndJourneys_050_FR003_FR004_FR006(t *testing.T) {
	t.Parallel()
	c, _ := crediting(t)

	got, err := c.Credit(t.Context(), authz.Scope{Everything: true}, everyActivity, 2026)
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}

	want := map[string]string{"A-1": "333.33", "A-2": "333.33", "A-3": "333.34", "A-5": "500.00",
		"A-6": "400.00", "unattributed": "90.00"}
	if diff := cmp.Diff(want, shown(got)); diff != "" {
		t.Errorf("credited under the seeded Equally distributed (-want +got):\n%s", diff)
	}
	if got.Model != attribution.Equal || got.WithoutRate != 1 {
		t.Errorf("model %q, without rate %d; want %q and the GBP fact counted", got.Model, got.WithoutRate, attribution.Equal)
	}
}

func TestCrediting_AModelChangeRestatesEveryFigure_050_FR009_SC002(t *testing.T) {
	t.Parallel()
	c, settings := crediting(t)
	if _, err := settings.SaveSettings(withPermissions(authz.SettingsManage), alex,
		attribution.SettingsInput{Version: 1, Model: attribution.LastTouch}); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}

	got, err := c.Credit(t.Context(), authz.Scope{Everything: true}, []string{"A-3", "A-9"}, 2026)
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}

	want := map[string]string{"A-3": "1000.00", "unattributed": "0.00"}
	if diff := cmp.Diff(want, shown(got)); diff != "" || got.Model != attribution.LastTouch {
		t.Errorf("after the change to last touch, model %q (-want +got):\n%s", got.Model, diff)
	}
}

// A-1 touched J-1, which converts on A-9, and J-2, whose conversion on A-8 came before the touch.
func TestCrediting_AnActivitysCreditIsTheSameWhateverElseIsInView_050_C3(t *testing.T) {
	t.Parallel()
	c, _ := crediting(t)

	alone, err := c.Credit(t.Context(), authz.Scope{Everything: true}, []string{"A-1"}, 2026)
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}
	converting, err := c.Credit(t.Context(), authz.Scope{Everything: true}, []string{"A-8"}, 2026)
	if err != nil {
		t.Fatalf("Credit: %v", err)
	}

	if diff := cmp.Diff(map[string]string{"A-1": "333.33", "unattributed": "0.00"}, shown(alone)); diff != "" {
		t.Errorf("A-1 alone in view, its share of A-9's conversion (-want +got):\n%s", diff)
	}
	if diff := cmp.Diff(map[string]string{"unattributed": "90.00"}, shown(converting)); diff != "" {
		t.Errorf("A-8 alone in view, the unattributed revenue of its own conversion (-want +got):\n%s", diff)
	}
}
