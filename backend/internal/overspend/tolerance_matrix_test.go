package overspend_test

import (
	"fmt"
	"net/http"
	"testing"

	"mapp/internal/campaign"
	"mapp/internal/overspend"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/money"
)

// budgetKind reads a budget's planned cost and saves its amount and setting.
type budgetKind struct {
	name       string
	named      string
	initiative string // where an activity under the budget goes; "" when the case checks the budget alone
	read       func(t *testing.T, c *apitest.Client) money.Amount
	save       func(t *testing.T, c *apitest.Client, amount money.Amount, mode string) *apitest.Response
}

func budgetKinds() []budgetKind {
	return []budgetKind{
		{name: "plan", read: readPlan, save: savePlan},
		{name: "campaign", named: "campaign 'Helix launch'", initiative: printOutdoor, read: readHelix, save: saveHelix},
		{name: "initiative", named: "initiative 'Print & outdoor'", initiative: printOutdoor, read: readInitiative,
			save: saveInitiative},
	}
}

func readPlan(t *testing.T, c *apitest.Client) money.Amount {
	t.Helper()
	return getPlan(t, c, "P-1004").PlanFigures.PlannedCost.Amount
}

func savePlan(t *testing.T, c *apitest.Client, amount money.Amount, mode string) *apitest.Response {
	t.Helper()
	return c.Do(t, http.MethodPatch, "/api/v1/plans/P-1004", planForm(getPlan(t, c, "P-1004"), amount, mode))
}

func helixView(t *testing.T, c *apitest.Client) campaign.CampaignView {
	t.Helper()
	return decoded[campaign.CampaignView](t, c.Do(t, http.MethodGet, "/api/v1/campaigns/"+helix, nil), http.StatusOK)
}

func readHelix(t *testing.T, c *apitest.Client) money.Amount {
	t.Helper()
	return helixView(t, c).BudgetAndCost.PlannedCost.Amount
}

func saveHelix(t *testing.T, c *apitest.Client, amount money.Amount, mode string) *apitest.Response {
	t.Helper()
	return c.Do(t, http.MethodPatch, "/api/v1/campaigns/"+helix, helixForm(helixView(t, c).Version, amount.String(), mode))
}

func initiativeView(t *testing.T, c *apitest.Client) campaign.InitiativeView {
	t.Helper()
	return decoded[campaign.InitiativeView](t, c.Do(t, http.MethodGet, "/api/v1/initiatives/"+printOutdoor, nil), http.StatusOK)
}

func readInitiative(t *testing.T, c *apitest.Client) money.Amount {
	t.Helper()
	return initiativeView(t, c).BudgetAndCost.PlannedCost.Amount
}

func saveInitiative(t *testing.T, c *apitest.Client, amount money.Amount, mode string) *apitest.Response {
	t.Helper()
	v := initiativeView(t, c)
	return c.Do(t, http.MethodPatch, "/api/v1/initiatives/"+printOutdoor, map[string]any{
		"name": v.Name, "description": v.Description, "ownerId": v.OwnerID, "startDate": v.StartDate,
		"endDate": v.EndDate, "budget": money2(amount.String()), "attributes": v.Attributes,
		"overspend": mode, "version": v.Version,
	})
}

func setTolerance(t *testing.T, server *apitest.Server, percent int) {
	t.Helper()
	alex := server.SignIn(t, alexsEmail)
	c := decoded[overspend.ConfigurationView](t, alex.Do(t, http.MethodGet, "/api/v1/overspend-configuration", nil), http.StatusOK)
	decoded[overspend.ConfigurationView](t, alex.Do(t, http.MethodPut, "/api/v1/overspend-configuration", map[string]any{
		"version": c.Version, "defaultMode": c.DefaultMode, "tolerancePercent": percent}), http.StatusOK)
}

// lowestBudget is the smallest budget that planned still fits within with the tolerance, to the cent.
func lowestBudget(planned money.Amount, percent int) money.Amount {
	b := money.FromCents(planned.Cents() * 100 / int64(100+percent)) // never above the answer
	for b.Add(overspend.Allowance(b, percent)).Cmp(planned) < 0 {
		b = b.Add(money.FromCents(1))
	}
	return b
}

func status(t *testing.T, what string, r *apitest.Response, want int) {
	t.Helper()
	if r.Status != want {
		t.Errorf("%s: status %d %s, want %d", what, r.Status, r.Body, want)
	}
}

// demo-mvp #4: under Refuse, exactly at the tolerance saves and one cent beyond it is refused, for a budget
// lowered and for the planned cost of an activity under it, at 0, 10 and 20 %.
func TestRefuse_ExactlyAtTheToleranceSavesOneCentBeyondIsRefused_Contract_DemoMVP4(t *testing.T) {
	t.Parallel()
	for _, percent := range []int{0, 10, 20} {
		for _, k := range budgetKinds() {
			t.Run(fmt.Sprintf("%s at %d%%", k.name, percent), func(t *testing.T) {
				t.Parallel()
				server := apitest.New(t)
				setTolerance(t, server, percent)
				priya := server.SignIn(t, priyasEmail)
				planned := k.read(t, priya)
				status(t, "Refuse at the planned cost", k.save(t, priya, planned, "refuse"), http.StatusOK)
				lowest := lowestBudget(planned, percent)
				status(t, "budget one cent beyond", k.save(t, priya, lowest.Sub(money.FromCents(1)), "refuse"), http.StatusConflict)
				status(t, "budget exactly at the tolerance", k.save(t, priya, lowest, "refuse"), http.StatusOK)
				if k.initiative == "" {
					return
				}
				room := money.FromCents(10_000)
				status(t, "Refuse with 100.00 room", k.save(t, priya, planned.Add(room), "refuse"), http.StatusOK)
				atTolerance := room.Add(overspend.Allowance(planned.Add(room), percent))
				status(t, "activity exactly at the tolerance",
					createActivity(t, priya, k.initiative, newActivity("At", atTolerance.String())), http.StatusCreated)
				refusedNaming(t, createActivity(t, priya, k.initiative, newActivity("Cent", "0.01")), k.named)
			})
		}
	}
}

// demo-mvp #3: under Warn nothing refuses, however far over a budget a save takes the planned cost.
func TestWarn_NothingRefuses_Contract_DemoMVP3(t *testing.T) {
	t.Parallel()
	for _, k := range budgetKinds() {
		t.Run(k.name, func(t *testing.T) {
			t.Parallel()
			server := apitest.New(t)
			setTolerance(t, server, 0)
			priya := server.SignIn(t, priyasEmail)
			status(t, "budget far below its planned cost", k.save(t, priya, money.FromCents(100), "warn"), http.StatusOK)
			if k.initiative != "" {
				status(t, "activity far over the budget",
					createActivity(t, priya, k.initiative, newActivity("Far over", "1000000.00")), http.StatusCreated)
			}
		})
	}
}
