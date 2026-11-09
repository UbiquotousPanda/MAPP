package attribution_test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/history"
	"mapp/internal/history/historytest"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/attribution/attributiontest"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/fake"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/money"
)

const (
	helix     = "A-1"
	caseStudy = "A-2"
	webinars  = "A-3"
	feed      = "Measure demo feed"
)

// dealStore answers the deals read from fixed facts and counts its calls, so a test can pin the statement count.
type dealStore struct {
	facts factStore
	names []attribution.ActivityName
	held  int
	calls *int
}

func (s dealStore) Conversions(ctx context.Context, scope authz.Scope, asked []string, year int) ([]attribution.RevenueFact, error) {
	*s.calls++
	return s.facts.Conversions(ctx, scope, asked, year)
}

func (s dealStore) Touches(ctx context.Context, scope authz.Scope, refs []string) ([]attribution.JourneyTouch, error) {
	*s.calls++
	return s.facts.Touches(ctx, scope, refs)
}

func (s dealStore) ActivitiesInScope(_ context.Context, _ authz.Scope, asked []string) ([]attribution.ActivityName, error) {
	*s.calls++
	var out []attribution.ActivityName
	for _, n := range s.names {
		if slices.Contains(asked, n.ID) {
			out = append(out, n)
		}
	}
	return out, nil
}

func (s dealStore) HeldFacts(context.Context, authz.Scope, string, []string) (int, error) {
	*s.calls++
	return s.held, nil
}

type displays map[string]string

func (d displays) Display(_ context.Context, _ actor.Actor, code string) (money.Display, error) {
	return money.DisplayIn(code, d[code]), nil
}

type dealsFixture struct {
	deals    *attribution.Deals
	settings *attribution.Service
	store    dealStore
	rates    rateTable
}

func dealsOn(tb testing.TB, store dealStore) dealsFixture {
	tb.Helper()
	db := fake.NewDB()
	generator := ids.NewGenerator(fake.NewCounters(db))
	now := func() time.Time { return time.Date(2026, 3, 15, 9, 0, 0, 0, time.UTC) }
	log := history.NewService(db, historytest.NewStore(db), generator, now)
	settings := attribution.NewService(history.Tools{Tx: db, IDs: generator, Log: log, Now: now}, attributiontest.NewStore(db))
	for _, k := range settings.Kinds() {
		if err := log.Register(k); err != nil {
			tb.Fatal(err)
		}
	}
	rates := rateTable{"USD": money.RateFromMicros(1_000_000), "EUR": money.RateFromMicros(920_000)}
	deals := attribution.NewDeals(attribution.DealsDeps{Tx: db, Settings: settings, Store: store, Rates: rates,
		Displays: displays{"EUR": "0.92"}, Now: now})
	return dealsFixture{deals: deals, settings: settings, store: store, rates: rates}
}

func (f dealsFixture) open(t *testing.T, q attribution.DealsQuery) attribution.ActivityDeals {
	t.Helper()
	out, err := f.deals.Of(withPermissions(authz.ReportsView), alex, q)
	if err != nil {
		t.Fatalf("Of(%+v): %v", q, err)
	}
	return out
}

// allPages is the first page's answer with every page's deals.
func (f dealsFixture) allPages(t *testing.T, q attribution.DealsQuery) attribution.ActivityDeals {
	t.Helper()
	q.Page = 1
	out := f.open(t, q)
	for len(out.Deals) < out.Total {
		q.Page++
		out.Deals = append(out.Deals, f.open(t, q).Deals...)
	}
	return out
}

func (f dealsFixture) designate(t *testing.T, m attribution.Model) {
	t.Helper()
	_, err := f.settings.SaveSettings(withPermissions(authz.SettingsManage), alex, attribution.SettingsInput{Version: 1, Model: m})
	if err != nil {
		t.Fatalf("designate %s: %v", m, err)
	}
}

func dated(m time.Month, d int) date.Date { return date.New(2026, m, d) }

func step(ref, activityID string, on date.Date, kind string) attribution.JourneyTouch {
	return attribution.JourneyTouch{JourneyRef: ref, Touch: attribution.Touch{ActivityID: activityID, Date: on}, Kind: kind}
}

func demoNames() []attribution.ActivityName {
	const plan, planName = "P-1", "FY2026 Measure demo – Lubricants Benelux"
	return []attribution.ActivityName{
		{ID: helix, Name: "Helix search and social, first half", Status: "approved", PlanID: plan, PlanName: planName},
		{ID: caseStudy, Name: "Tellus case studies", Status: "approved", PlanID: plan, PlanName: planName},
		{ID: webinars, Name: "Tellus webinar series", Status: "approved", PlanID: plan, PlanName: planName},
	}
}

// demoStore mirrors the Measure demo's journeys (D-400): 24,000 USD through J-1, 18,500 EUR through J-2 and
// 42,000 USD on Helix with no journey.
func demoStore() dealStore {
	calls := 0
	return dealStore{calls: &calls, names: demoNames(), facts: factStore{
		conversions: []attribution.RevenueFact{
			{ID: "PF-9", Source: feed, Reference: "MD-009", ActivityID: caseStudy, Date: dated(3, 6), Revenue: in("USD", 2_400_000), JourneyRef: "J-1"},
			{ID: "PF-13", Source: feed, Reference: "MD-013", ActivityID: helix, Date: dated(3, 9), Revenue: in("EUR", 1_850_000), JourneyRef: "J-2"},
			{ID: "PF-14", Source: feed, Reference: "MD-014", ActivityID: helix, Date: dated(2, 20), Revenue: in("USD", 4_200_000)},
		},
		touches: []attribution.JourneyTouch{
			step("J-1", helix, dated(1, 14), "inq"), step("J-1", webinars, dated(3, 2), "mql"),
			step("J-2", caseStudy, dated(1, 22), "inq"), step("J-2", caseStudy, dated(2, 12), "mql"),
			step("J-2", webinars, dated(3, 3), "mql"),
		},
	}}
}

func summary(p attribution.ActivityDeals) string {
	return fmt.Sprintf("credited %s · booked %s · reason %q · model %s", p.Credited.Amount, moneyText(p.Booked), p.Reason, p.Model.Key)
}

func dealLines(deals []attribution.Deal) []string {
	out := make([]string, 0, len(deals))
	for _, d := range deals {
		out = append(out, fmt.Sprintf("%s %s %s %s share %s steps %d", d.ID, d.Amount.Amount, d.Amount.Currency, d.Journey,
			d.Share.Amount, len(d.Steps)))
	}
	return out
}

func stepLines(steps []attribution.DealStep) []string {
	out := make([]string, 0, len(steps))
	for _, s := range steps {
		line := fmt.Sprintf("%s %s %s %s", s.Activity.ID, s.Date, strings.Join(s.Kinds, "+"), s.Share.Amount)
		if s.ThisActivity {
			line += " this activity"
		}
		out = append(out, line)
	}
	return out
}

func moneyText(m *money.Money) string {
	if m == nil {
		return "none"
	}
	return m.Amount.String() + " " + m.Currency
}

func rateText(r *string) string {
	if r == nil {
		return "none"
	}
	return *r
}

func TestDeals_DemoJourneys_WebinarSeries_058_US1_1(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())

	webinar := f.open(t, attribution.DealsQuery{ActivityID: webinars, Year: 2026})

	if got, want := summary(webinar), `credited 18702.90 · booked none · reason "" · model equallyDistributed`; got != want {
		t.Errorf("webinar = %s\nwant      %s", got, want)
	}
	want := []string{"PF-9 24000.00 USD shared share 12000.00 steps 2", "PF-13 18500.00 EUR shared share 6702.90 steps 3"}
	if diff := cmp.Diff(want, dealLines(webinar.Deals)); diff != "" {
		t.Fatalf("the webinar's deals, largest share first (-want +got):\n%s", diff)
	}
	euro := webinar.Deals[1]
	if got := euro.USD.Amount.String() + " at " + rateText(euro.Rate) + " on " + euro.BookedOn.ID; got != "20108.70 at 0.92 on A-1" {
		t.Errorf("the euro deal = %s; want 20108.70 at 0.92 on A-1 (Helix)", got)
	}
	steps := []string{"A-2 2026-01-22 inq 6702.90", "A-2 2026-02-12 mql 6702.90", "A-3 2026-03-03 mql 6702.90 this activity"}
	if diff := cmp.Diff(steps, stepLines(euro.Steps)); diff != "" {
		t.Errorf("the euro deal's steps in date order (-want +got):\n%s", diff)
	}
}

func TestDeals_DemoJourneys_Helix_058_US1_2(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())

	panel := f.open(t, attribution.DealsQuery{ActivityID: helix})

	want := []string{"PF-14 42000.00 USD none share 42000.00 steps 0", "PF-9 24000.00 USD shared share 12000.00 steps 2",
		"PF-13 18500.00 EUR shared share 0.00 steps 3"}
	if diff := cmp.Diff(want, dealLines(panel.Deals)); diff != "" {
		t.Errorf("Helix's deals, the one it booked but earned nothing from included (-want +got):\n%s", diff)
	}
	if got, want := summary(panel), `credited 54000.00 · booked 62108.70 USD · reason "" · model equallyDistributed`; got != want {
		t.Errorf("Helix = %s\nwant    %s", got, want)
	}
}

func TestDeals_DemoJourneys_LastTouch_058_US1_3(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())
	f.designate(t, attribution.LastTouch)

	last := f.open(t, attribution.DealsQuery{ActivityID: webinars})

	got := summary(last) + " · first share " + last.Deals[0].Share.Amount.String() + " · " + last.Model.Name
	want := `credited 44108.70 · booked none · reason "" · model lastTouch · first share 24000.00 · Last touch`
	if got != want {
		t.Errorf("under Last touch the webinar = %s\nwant %s", got, want)
	}
}
