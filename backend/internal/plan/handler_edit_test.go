package plan_test

import (
	"net/http"
	"testing"
	"time"

	"mapp/internal/plan"
	"mapp/internal/platform/apitest"
)

func europeForm(version int) map[string]any {
	return map[string]any{
		"version": version, "name": "FY2026 Lubricants Europe", "modelId": "MOD-1001", "teamIds": []string{"T-1001"},
		"ownerId": "U-1002", "aop": false, "description": "Lubricants marketing in Europe for 2026.",
		"budget": map[string]any{"amount": "1200000.00", "currency": "USD"}, "defaultFinanceBudgetId": "FB-1001",
		"defaultSpread": "evenly", "bcpir": false, "goalStage": "inq", "goalAmount": "250000",
		"attributes": map[string]any{"SA-1001": []string{"SO-1002"}},
	}
}

// Daniel's save answers the plan still Published at version 2; Priya's from the old version names him (the seed's
// global budget sets this plan's budget, so the edit changes the description).
func TestUpdatePlan_200_409_404_FR018_FR023(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	daniel := server.SignIn(t, danielsEmail)
	server.Advance(90 * time.Minute)
	edited := europeForm(1)
	edited["description"] = "Lubricants marketing in Europe for 2026, with the spring campaign."
	invalid := europeForm(0)
	invalid["name"] = ""

	saved := daniel.Do(t, http.MethodPatch, "/api/v1/plans/P-1001", edited)
	outOfDate := priya.Do(t, http.MethodPatch, "/api/v1/plans/P-1001", europeForm(1))
	refused := priya.Do(t, http.MethodPatch, "/api/v1/plans/P-1001", invalid)

	assertFields(t, saved, http.StatusOK, map[string]any{
		"status": "published", "version": 2, "year": 2026,
		"description": "Lubricants marketing in Europe for 2026, with the spring campaign.", "updatedAt": "2026-03-12T10:30:00Z", "updatedBy": map[string]any{"id": "U-1003", "name": "Daniel Okoro"},
	})
	assertAnswer(t, outOfDate, http.StatusConflict, `{"error":{"code":"version_conflict","message":"Not saved — Daniel Okoro changed this plan",`+
		`"fields":[],"conflict":{"changedBy":"Daniel Okoro","changedAt":"2026-03-12T10:30:00Z"}}}`)
	assertAnswer(t, refused, http.StatusBadRequest, validationBody(`{"field":"name","message":"Enter a plan name."},`+
		`{"field":"version","message":"Reload the page and try again."}`))
}

// Removing Lubricants from FY2027 Global Brand hides the Lubricants attributes of its activities, listed before
// saving.
func TestChangeEffects_FR019_FR020(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	server.GrantRole(t, priyasEmail, "globalPlanner", "all") // 014: every market's plans

	effects := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1003/change-effects",
		map[string]any{"modelId": "MOD-1002", "attributes": map[string]any{"SA-1001": []string{"SO-1001"}}})
	unknown := priya.Do(t, http.MethodPost, "/api/v1/plans/P-1003/change-effects",
		map[string]any{"modelId": "MOD-9999", "attributes": map[string]any{}})

	assertAnswer(t, effects, http.StatusOK, `{"modelChanged":true,"disallowedActivities":[],"hiddenGroups":[`+
		`{"unit":"Lubricants","levels":["activity"],"attributes":["Brands","Global key accounts","Sector","Sub-sector","Product launch"]}],`+
		`"shownGroups":[]}`)
	assertAnswer(t, unknown, http.StatusBadRequest, validationBody(`{"field":"modelId","message":"Choose a model from the list."}`))
}

func formOf(p plan.PlanView) map[string]any {
	teamIDs := []string{}
	for _, team := range p.Teams {
		teamIDs = append(teamIDs, team.ID)
	}
	form := map[string]any{
		"version": p.Version, "name": p.Name, "modelId": p.Model.ID, "teamIds": teamIDs, "ownerId": nil,
		"aop": p.AOP, "description": p.Description, "budget": p.Budget, "defaultFinanceBudgetId": nil,
		"defaultSpread": p.DefaultSpread, "bcpir": p.BCPIR, "goalStage": p.GoalStage, "goalAmount": p.GoalAmount,
		"attributes": p.Attributes,
	}
	if p.Owner != nil {
		form["ownerId"] = p.Owner.ID
	}
	if p.DefaultFinanceBudget != nil {
		form["defaultFinanceBudgetId"] = p.DefaultFinanceBudget.ID
	}
	return form
}
