package seed_test

import (
	"fmt"
	"net/http"
	"reflect"
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
	"mapp/seed"
)

const measurePlan = "FY2026 Measure demo – Lubricants Benelux"

// With the Measure demo every demo record is still there as it was, ID included: it only adds (D-354).
func TestLoad_MeasureOnlyAddsRecords_D354(t *testing.T) {
	t.Parallel()
	plain, measured := demoIn(t, apitest.DemoDB(t, false)), demoIn(t, apitest.MeasureDemoDB(t))

	kept(t, "people", plain.people, measured.people)
	kept(t, "teams", plain.teams, measured.teams)
	kept(t, "memberships", plain.memberships, measured.memberships)
	kept(t, "currencies", plain.currencies, measured.currencies)
	kept(t, "rates", plain.rates, measured.rates)
	kept(t, "rate imports", plain.rateImports, measured.rateImports)
	kept(t, "activity types", plain.activityTypes, measured.activityTypes)
	kept(t, "models", plain.models, measured.models)
	kept(t, "finance budgets", plain.budgets, measured.budgets)
	kept(t, "finance budget items", plain.items, measured.items)
	kept(t, "attributes", plain.attributes, measured.attributes)
	kept(t, "options", plain.options, measured.options)
	kept(t, "plans", plain.plans, measured.plans)
	kept(t, "campaigns", plain.campaigns, measured.campaigns)
	kept(t, "initiatives", plain.initiatives, measured.initiatives)
	kept(t, "activities", plain.activities, measured.activities)
	kept(t, "line items", plain.lineItems, measured.lineItems)
	kept(t, "workflows", plain.workflows, measured.workflows)
	kept(t, "rounds", plain.rounds, measured.rounds)
	kept(t, "roles", plain.roles, measured.roles)
	kept(t, "role assignments", plain.assignments, measured.assignments)
	kept(t, "approval actions", plain.actions, measured.actions)
	kept(t, "delegations", plain.delegations, measured.delegations)
	kept(t, "purchase requests", plain.purchaseRequests, measured.purchaseRequests)
	for id, list := range plain.notifications {
		kept(t, "notifications of "+id, list, measured.notifications[id])
	}
	if !reflect.DeepEqual(plain.accessRules, measured.accessRules) {
		t.Error("the Measure demo changed the access rules")
	}
}

func kept[T any](t *testing.T, kind string, plain, measured []T) {
	t.Helper()
	for _, record := range plain {
		if !slices.ContainsFunc(measured, func(m T) bool { return reflect.DeepEqual(m, record) }) {
			t.Errorf("%s: the Measure demo changed %+v", kind, record)
		}
	}
}

// seed.MeasureLoaded, which the seed command prints after -measure, says exactly what the Measure demo adds.
func TestMeasureLoaded_SaysWhatIsAdded(t *testing.T) {
	t.Parallel()
	plain, measured := demoIn(t, apitest.DemoDB(t, false)), demoIn(t, apitest.MeasureDemoDB(t))

	got := fmt.Sprintf("%d team, %d plan, %d campaigns, %d initiatives, %d activities, %d line items, %d approval rounds",
		len(measured.teams)-len(plain.teams), len(measured.plans)-len(plain.plans),
		len(measured.campaigns)-len(plain.campaigns), len(measured.initiatives)-len(plain.initiatives),
		len(measured.activities)-len(plain.activities), len(measured.lineItems)-len(plain.lineItems),
		len(measured.rounds)-len(plain.rounds))
	if got != seed.MeasureLoaded {
		t.Errorf("added: %s\nseed.MeasureLoaded: %s", got, seed.MeasureLoaded)
	}
}

// The Measure plan's team has no members: who sees all markets sees it, and a marketer's plans stay as they are.
func TestLoad_MeasurePlanOnlyInAllMarkets(t *testing.T) {
	t.Parallel()
	plain, measured := apitest.New(t), apitest.New(t, apitest.WithMeasureDemo())

	if got, want := planNames(t, measured, "priya.raman@shell.com"), planNames(t, plain, "priya.raman@shell.com"); !slices.Equal(got, want) {
		t.Errorf("Priya's plans with the Measure demo = %v, want %v as without it", got, want)
	}
	if got := planNames(t, measured, "carlos.mendes@shell.com"); !slices.Contains(got, measurePlan) {
		t.Errorf("Carlos (All markets) sees %v, want %q among them", got, measurePlan)
	}
}

func planNames(t *testing.T, server *apitest.Server, email string) []string {
	t.Helper()
	var page struct{ Items []struct{ Name string } }
	server.SignIn(t, email).Do(t, http.MethodGet, "/api/v1/plans", nil).Decode(t, &page)
	names := make([]string, 0, len(page.Items))
	for _, p := range page.Items {
		names = append(names, p.Name)
	}
	return names
}
