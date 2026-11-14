package attribution_test

import (
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
)

func dealText(d attribution.Deal) string {
	return fmt.Sprintf("%s %d steps share %s", d.Journey, len(d.Steps), d.Share.Amount)
}

func dealByID(deals []attribution.Deal, id string) attribution.Deal {
	at := slices.IndexFunc(deals, func(d attribution.Deal) bool { return d.ID == id })
	if at < 0 {
		return attribution.Deal{ID: "missing " + id}
	}
	return deals[at]
}

func TestDeals_StepOutsideScope_058_US1_5_FR014(t *testing.T) {
	t.Parallel()
	store := demoStore()
	store.facts.touches = slices.DeleteFunc(store.facts.touches, func(x attribution.JourneyTouch) bool { return x.ActivityID == webinars })
	store.names = store.names[:2]
	f := dealsOn(t, store)

	panel := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026})

	want := []string{"PF-14 42000.00 USD none share 42000.00 steps 0", "PF-9 24000.00 USD shared share 24000.00 steps 1",
		"PF-13 18500.00 EUR shared share 0.00 steps 2"}
	if diff := cmp.Diff(want, dealLines(panel.Deals)); diff != "" {
		t.Errorf("with the webinar's plan out of scope, its steps vanish and the others share (-want +got):\n%s", diff)
	}
	names := strings.Join(stepLines(slices.Concat(panel.Deals[1].Steps, panel.Deals[2].Steps)), "; ")
	if strings.Contains(names, webinars) || panel.Credited.Amount.String() != "66000.00" {
		t.Errorf("steps %q, credited %s; want no webinar step and 66000.00, Helix taking the whole of J-1", names, panel.Credited.Amount)
	}
}

func TestDeals_NoJourneyAndUnattributed_058_FR006(t *testing.T) {
	t.Parallel()
	store := demoStore()
	store.facts.conversions = append(store.facts.conversions, attribution.RevenueFact{ID: "PF-20", Source: feed, Reference: "MD-020",
		ActivityID: helix, Date: dated(3, 10), Revenue: in("USD", 100_000), JourneyRef: "J-9"})
	store.facts.touches = append(store.facts.touches, step("J-9", webinars, dated(3, 30), "mql"))
	f := dealsOn(t, store)

	panel := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026})
	webinar := f.open(t, attribution.DealsQuery{ActivityID: webinars, Year: 2026})

	got := dealText(dealByID(panel.Deals, "PF-14")) + " | " + dealText(dealByID(panel.Deals, "PF-20")) + " | booked " + moneyText(panel.Booked)
	want := "none 0 steps share 42000.00 | unattributed 0 steps share 0.00 | booked 63108.70 USD"
	if got != want {
		t.Errorf("no journey, then a step after the deal:\n got %s\nwant %s", got, want)
	}
	if slices.ContainsFunc(webinar.Deals, func(d attribution.Deal) bool { return d.ID == "PF-20" }) {
		t.Errorf("the webinar lists PF-20, whose only step came after it")
	}
}

func TestDeals_WithoutRateHeldAndNotApproved_058_FR012_FR019_FR021(t *testing.T) {
	t.Parallel()
	store := demoStore()
	store.facts.conversions = append(store.facts.conversions, attribution.RevenueFact{ID: "PF-30", Source: feed, Reference: "MD-030",
		ActivityID: helix, Date: dated(3, 1), Revenue: in("GBP", 500_000)})
	store.held = 2
	store.names = append(store.names,
		attribution.ActivityName{ID: "A-7", Name: "Waiting", Status: "submitted", PlanID: "P-1", PlanName: "Plan"},
		attribution.ActivityName{ID: "A-8", Name: "Quiet", Status: "approved", PlanID: "P-1", PlanName: "Plan"})
	f := dealsOn(t, store)

	panel := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026})
	waiting := f.open(t, attribution.DealsQuery{ActivityID: "A-7", Year: 2026})
	quiet := f.open(t, attribution.DealsQuery{ActivityID: "A-8"})

	if got := fmt.Sprintf("without rate %d, held %d, %d deals", panel.WithoutRate, panel.HeldFacts, len(panel.Deals)); got != "without rate 1, held 2, 3 deals" {
		t.Errorf("%s; want without rate 1, held 2, 3 deals (the GBP one left out)", got)
	}
	if got := summary(waiting) + fmt.Sprintf(" · list nil %v", waiting.Deals == nil); got != `credited 0.00 · booked none · reason "notApproved" · model equallyDistributed · list nil false` {
		t.Errorf("a submitted activity = %s; want notApproved, 0.00, nothing booked and an empty list", got)
	}
	if quiet.Reason != attribution.ReasonNoData {
		t.Errorf("an approved activity without deals = %q, want noData", quiet.Reason)
	}
}

func TestDeals_OrderAndPages_058_FR003(t *testing.T) {
	t.Parallel()
	calls := 0
	store := dealStore{calls: &calls, names: demoNames()}
	for i := range 30 {
		store.facts.conversions = append(store.facts.conversions, attribution.RevenueFact{ID: fmt.Sprintf("PF-%02d", i),
			Reference: fmt.Sprintf("R-%d", i), ActivityID: helix, Date: dated(1, i%28+1), Revenue: in("USD", int64((i%15+1)*10_000))})
	}
	f := dealsOn(t, store)

	first := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026, Page: 1})
	second := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026, Page: 2})
	beyond := f.open(t, attribution.DealsQuery{ActivityID: helix, Year: 2026, Page: 3})

	pages := fmt.Sprintf("%d of %d, %d, %d of %d", len(first.Deals), first.Total, len(second.Deals), len(beyond.Deals), beyond.Total)
	if pages != "25 of 30, 5, 0 of 30" {
		t.Errorf("pages = %s; want 25 of 30, 5, 0 of 30", pages)
	}
	if !ordered(first.Deals) {
		t.Errorf("deals %v: want the larger share first, then the newer", dealLines(first.Deals))
	}
	if totals := first.Credited.Amount.String() + " " + moneyText(second.Booked); totals != "24000.00 24000.00 USD" {
		t.Errorf("totals on a page = %s; want every deal's 24000.00 on every page", totals)
	}
}

// ordered says whether the deals come largest share first, the newer first on a tie.
func ordered(deals []attribution.Deal) bool {
	for i := 1; i < len(deals); i++ {
		a, b := deals[i-1], deals[i]
		if a.Share.Amount.Cmp(b.Share.Amount) < 0 {
			return false
		}
		if a.Share == b.Share && a.Date.Before(b.Date) {
			return false
		}
	}
	return true
}

func TestDeals_NotFoundAlike_058_FR016(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())

	_, err := f.deals.Of(withPermissions(authz.ReportsView), alex, attribution.DealsQuery{ActivityID: "A-404"})
	if codeOf(err) != errs.CodeNotFound {
		t.Errorf("an activity the viewer can't see = %v, want not_found", err)
	}
}

func TestDeals_StatementsDoNotGrow_058_FR025(t *testing.T) {
	t.Parallel()
	counts := map[int]int{}
	for _, n := range []int{1, 10, 100} {
		store := randomStore(n)
		f := dealsOn(t, store)
		*store.calls = 0
		f.open(t, attribution.DealsQuery{ActivityID: "A-1", Year: 2026})
		counts[n] = *store.calls
	}
	if counts[1] == 0 || counts[1] != counts[10] || counts[10] != counts[100] {
		t.Errorf("store calls at 1, 10 and 100 deals = %v; want the same count", counts)
	}
}

func comparisonText(p attribution.ActivityDeals) string {
	if p.Comparison == nil {
		return "none " + moneyText(p.ComparisonCredited)
	}
	return p.Comparison.Name + " " + moneyText(p.ComparisonCredited)
}

func TestDeals_CompareLastTouch_058_US2_1(t *testing.T) {
	t.Parallel()
	f := dealsOn(t, demoStore())

	panel := f.open(t, attribution.DealsQuery{ActivityID: webinars, Year: 2026, Compare: attribution.LastTouch})
	same := f.open(t, attribution.DealsQuery{ActivityID: webinars, Year: 2026, Compare: attribution.Equal})

	if got := comparisonText(panel); got != "Last touch 44108.70 USD" {
		t.Fatalf("comparison = %s; want Last touch 44108.70 USD", got)
	}
	shares := moneyText(panel.Deals[0].ComparisonShare) + " | " + moneyText(panel.Deals[1].ComparisonShare)
	steps := moneyText(panel.Deals[0].Steps[0].ComparisonShare) + " | " + moneyText(panel.Deals[0].Steps[1].ComparisonShare)
	if got := shares + " · steps " + steps; got != "24000.00 USD | 20108.70 USD · steps 0.00 USD | 24000.00 USD" {
		t.Errorf("comparison shares = %s; want the deals' 24000.00 and 20108.70, the first deal's steps 0.00 and 24000.00", got)
	}
	if got := comparisonText(same) + " " + moneyText(same.Deals[0].ComparisonShare); got != "none none none" {
		t.Errorf("comparing with the designated model = %s; want no comparison at all", got)
	}
}
