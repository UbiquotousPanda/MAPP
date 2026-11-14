package measure_test

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/sheet"
)

// oldWidgets are the nine old reports' export widgets.
func oldWidgets() map[string][]string {
	return map[string][]string{
		measure.KeyPlanBudget:       {"cards", "periods", "ranked"},
		measure.KeyApprovals:        {"status", "average", "approvals"},
		measure.KeyPurchaseRequests: {"cards", "status", "byVendor", "byOwner", "grid"},
		measure.KeyPlanDetails:      {"statusCount", "attr12Count"},
		measure.KeyGsapLink:         {"swbs", "swbsBands", "waiting", "orders"},
		measure.KeyUserAccess:       {"people", "signInBands"},
		measure.KeySummary: {"revenue", "trend", "funnel", "conversion", "leagueRevenue", "leaguePerformance",
			"leagueCost", "leagueRoi"},
		measure.KeyRevenue: {"cards", "periods", "ranked", "deals"},
		measure.KeyFunnel:  {"cards", "periods", "ranked"},
	}
}

// widgetsReport names each sheet "<old key>.<widget>: <the own parameters it was given>".
type widgetsReport struct{ key string }

func (r widgetsReport) Key() string     { return r.key }
func (r widgetsReport) Available() bool { return true }
func (r widgetsReport) Params() []string {
	return []string{r.key + "Param"}
}

func (r widgetsReport) Sheets(_ context.Context, _ actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	var out []measure.WidgetSheet
	for _, w := range oldWidgets()[r.key] {
		out = append(out, measure.WidgetSheet{Key: w, Sheet: sheet.Sheet{Name: r.key + "." + w + ": " + f.Own.Encode()}})
	}
	return out, nil
}

func (r widgetsReport) Describe(_ context.Context, _ actor.Actor, own url.Values) ([][2]string, error) {
	return [][2]string{{"Own", own.Encode()}}, nil
}

func widgetsRegistry(t *testing.T) *measure.Registry {
	t.Helper()
	registry := measure.NewRegistry()
	for key := range oldWidgets() {
		if err := registry.Register(widgetsReport{key: key}); err != nil {
			t.Fatal(err)
		}
	}
	return registry
}

// sheetsOf are the sheet names of the report for the address's own parameters.
func sheetsOf(ctx context.Context, t *testing.T, report, own string) ([]string, error) {
	t.Helper()
	r, _ := widgetsRegistry(t).Get(report)
	values, _ := url.ParseQuery(own)
	sheets, err := r.Sheets(ctx, actor.Actor{ID: "U-1"}, measure.Filter{Own: values})
	var got []string
	for _, ws := range sheets {
		got = append(got, ws.Sheet.Name)
	}
	return got, err
}

func TestSections_SheetsOfTheSectionShown_059_FR011(t *testing.T) {
	t.Parallel()
	ctx := withPermissions(t, authz.ReportsView)
	for _, tc := range []struct{ report, own string }{
		{"performance", "stage=mql&category=c1&sort=roi"},
		{"performance", "stage=nope"},
		{"purchasing", "tab=orders&vendor=V-1&sort=amount"},
		{"purchasing", ""},
		{"planData", "tab=completeness"},
		{"budget", "sort=actual"},
	} {
		got, err := sheetsOf(ctx, t, tc.report, tc.own)
		if err != nil {
			t.Fatalf("%s?%s: %v", tc.report, tc.own, err)
		}
		want := map[string][]string{
			"performance?stage=mql&category=c1&sort=roi": {"summary.revenue: category=c1", "summary.funnel: category=c1",
				"summary.conversion: category=c1", "funnel.cards: category=c1&sort=roi&stage=mql",
				"funnel.periods: category=c1&sort=roi&stage=mql", "funnel.ranked: category=c1&sort=roi&stage=mql"},
			"performance?stage=nope": {"summary.revenue: ", "summary.funnel: ", "summary.conversion: ",
				"revenue.cards: stage=nope", "revenue.periods: stage=nope", "revenue.ranked: stage=nope",
				"revenue.deals: stage=nope"},
			"purchasing?tab=orders&vendor=V-1&sort=amount": {"purchaseRequests.cards: vendor=V-1",
				"purchaseRequests.status: vendor=V-1", "purchaseRequests.byVendor: vendor=V-1",
				"purchaseRequests.byOwner: vendor=V-1", "gsapLink.orders: sort=amount&tab=orders&vendor=V-1"},
			"purchasing?": {"purchaseRequests.cards: ", "purchaseRequests.status: ", "purchaseRequests.byVendor: ",
				"purchaseRequests.byOwner: ", "purchaseRequests.grid: "},
			"planData?tab=completeness": {"planDetails.statusCount: tab=completeness",
				"planDetails.attr12Count: tab=completeness"},
			"budget?sort=actual": {"planBudget.cards: sort=actual", "planBudget.periods: sort=actual",
				"planBudget.ranked: sort=actual"},
		}[tc.report+"?"+tc.own]
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("%s?%s sheets (-want +got):\n%s", tc.report, tc.own, diff)
		}
	}
}

func TestSections_ParamsAndDescribeNameTheSection_059_FR011(t *testing.T) {
	t.Parallel()
	r, _ := widgetsRegistry(t).Get(measure.KeyPurchasing)
	params := r.(measure.Parameterised).Params()
	if want := []string{"gsapLinkParam", "purchaseRequestsParam", "tab"}; !slices.Equal(params, want) {
		t.Errorf("Params() = %v, want %v", params, want)
	}
	lines, err := r.(measure.Described).Describe(t.Context(), actor.Actor{}, url.Values{"tab": {"waiting"}})
	want := [][2]string{{"Own", ""}, {"Section", "Waiting for GSAP"}, {"Own", "tab=waiting"}}
	if diff := cmp.Diff(want, lines); err != nil || diff != "" {
		t.Errorf("Describe() error %v, lines (-want +got):\n%s", err, diff)
	}
}

func TestSections_PeopleNeedsAccessManage_059_FR007(t *testing.T) {
	t.Parallel()
	_, err := sheetsOf(withPermissions(t, authz.ReportsView), t, measure.KeyPlanData, "tab=people")
	if e, ok := errors.AsType[*errs.Error](err); !ok || e.Status != http.StatusForbidden {
		t.Errorf("People without access.manage: error = %v, want forbidden", err)
	}
	got, err := sheetsOf(withPermissions(t, authz.ReportsView, authz.AccessManage), t, measure.KeyPlanData, "tab=people")
	if err != nil || len(got) != 2 || !strings.HasPrefix(got[0], "userAccess.people") {
		t.Errorf("People with access.manage = %v, %v; want User access's sheets", got, err)
	}
}

// Every widget of the nine reports is exported by one of the five, but Summary's trend and league tables.
func TestSections_EveryOldWidgetHasAHome_059_SC002(t *testing.T) {
	t.Parallel()
	ctx := withPermissions(t, authz.ReportsView, authz.AccessManage)
	addresses := map[string][]string{"performance": {"stage=revenue", "stage=mql", "stage=inq"}, "budget": {""},
		"approvals": {""}, "purchasing": {"tab=requests", "tab=swbs", "tab=waiting", "tab=orders"},
		"planData": {"tab=completeness", "tab=people"}}
	homed := map[string]bool{}
	for report, owns := range addresses {
		for _, own := range owns {
			got, err := sheetsOf(ctx, t, report, own)
			if err != nil {
				t.Fatal(err)
			}
			for _, name := range got {
				homed[strings.Split(name, ":")[0]] = true
			}
		}
	}
	removed := []string{"summary.trend", "summary.leagueRevenue", "summary.leaguePerformance", "summary.leagueCost",
		"summary.leagueRoi"}
	for key, widgets := range oldWidgets() {
		for _, w := range widgets {
			if name := key + "." + w; homed[name] == slices.Contains(removed, name) {
				t.Errorf("%s: exported %v, want %v", name, homed[name], !slices.Contains(removed, name))
			}
		}
	}
}
