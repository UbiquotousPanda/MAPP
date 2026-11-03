package seed_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"slices"
	"testing"

	"mapp/internal/financials"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/fake"
	"mapp/internal/stores/storestest"
	"mapp/seed"
)

const measurePlan = "FY2026 Measure demo – Lubricants Benelux"

// With the Measure demo every demo record is still there as it was, ID included: it only adds (D-354).
func TestLoad_MeasureOnlyAddsRecords_D354(t *testing.T) {
	t.Parallel()
	plainDB, measuredDB := apitest.DemoDB(t, false), apitest.MeasureDemoDB(t)
	plain, measured := demoIn(t, plainDB), demoIn(t, measuredDB)

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
	plainGSAP, measuredGSAP := gsapIn(t, plainDB), gsapIn(t, measuredDB)
	kept(t, "financial transactions", plainGSAP.transactions, measuredGSAP.transactions)
	kept(t, "financial imports", plainGSAP.imports, measuredGSAP.imports)
	kept(t, "activity-log entries", logIn(t, plainDB), logIn(t, measuredDB))
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
	plainDB, measuredDB := apitest.DemoDB(t, false), apitest.MeasureDemoDB(t)
	plain, measured := demoIn(t, plainDB), demoIn(t, measuredDB)
	coded := func(d demoData) int {
		n := 0
		for _, li := range d.lineItems {
			if li.SwbsCode != "" {
				n++
			}
		}
		return n
	}

	got := fmt.Sprintf("%d team, %d plan, %d campaigns, %d initiatives, %d activities, %d line items (%d with SWBS codes), "+
		"%d approval workflow, %d approval rounds, %d purchase requests, %d financial transactions, %d activity categories",
		len(measured.teams)-len(plain.teams), len(measured.plans)-len(plain.plans),
		len(measured.campaigns)-len(plain.campaigns), len(measured.initiatives)-len(plain.initiatives),
		len(measured.activities)-len(plain.activities), len(measured.lineItems)-len(plain.lineItems),
		coded(measured)-coded(plain), len(measured.workflows)-len(plain.workflows), len(measured.rounds)-len(plain.rounds),
		len(measured.purchaseRequests)-len(plain.purchaseRequests),
		len(gsapIn(t, measuredDB).transactions)-len(gsapIn(t, plainDB).transactions),
		len(categoriesIn(t, measuredDB))-len(categoriesIn(t, plainDB)))
	facts := performanceIn(t, measuredDB)
	rows := 0
	for _, run := range facts.imports {
		rows += run.Counts.Read
	}
	got += fmt.Sprintf(", %d performance data source with %d column mappings, %d performance import of %d rows with "+
		"%d facts and %d journeys, %d activity-log entry", len(facts.sources), len(facts.mappings), len(facts.imports), rows,
		len(facts.facts), len(facts.journeys()), len(logIn(t, measuredDB))-len(logIn(t, plainDB)))
	if got != seed.MeasureLoaded {
		t.Errorf("added: %s\nseed.MeasureLoaded: %s", got, seed.MeasureLoaded)
	}
}

type gsapData struct {
	transactions []financials.Transaction
	imports      []financials.Import
}

func gsapIn(t *testing.T, db *fake.DB) gsapData {
	t.Helper()
	var g gsapData
	read(t, db, func(ctx context.Context) error {
		set := storestest.New(db)
		var listed, imported error
		g.transactions, listed = set.Financials.ListTransactions(ctx)
		g.imports, imported = set.Financials.ListImports(ctx)
		return errors.Join(listed, imported)
	})
	return g
}

// The Measure plan's team has no members: who sees all markets sees it, and a marketer's plans stay as they are.
func TestLoad_MeasurePlanOnlyInAllMarkets(t *testing.T) {
	t.Parallel()
	plain, measured := apitest.New(t), apitest.New(t, apitest.WithMeasureDemo())

	if got, want := planNames(t, measured, "priya.raman@shell.com"), planNames(t, plain, "priya.raman@shell.com"); !slices.Equal(got, want) {
		t.Errorf("Priya's plans with the Measure demo = %v, want %v as without it", got, want)
	}
	for _, email := range []string{"carlos.mendes@shell.com", "lea.santos@shell.com"} {
		if got := planNames(t, measured, email); !slices.Contains(got, measurePlan) {
			t.Errorf("%s (All markets) sees %v, want %q among them", email, got, measurePlan)
		}
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
