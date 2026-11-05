package overspend_test

import (
	"net/http"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/activity"
	"mapp/internal/overspend"
	"mapp/internal/platform/apitest"
)

func TestActivityForm_ShowsTheLimitsAbove_Contract_037_FR014(t *testing.T) {
	t.Parallel()
	server := apitest.New(t)
	priya := server.SignIn(t, priyasEmail)
	before := decoded[activity.FormView](t, priya.Do(t, http.MethodGet, "/api/v1/initiatives/"+digital+"/activity-form", nil),
		http.StatusOK)
	refuseHelix(t, priya, "100.00")

	newForm := decoded[activity.FormView](t, priya.Do(t, http.MethodGet, "/api/v1/initiatives/"+digital+"/activity-form", nil),
		http.StatusOK)
	editForm := decoded[activity.FormView](t, priya.Do(t, http.MethodGet, "/api/v1/activities/A-1001/form", nil), http.StatusOK)
	outside := decoded[activity.FormView](t, priya.Do(t, http.MethodGet, "/api/v1/initiatives/I-1003/activity-form", nil),
		http.StatusOK)

	limits := []string{}
	for _, l := range refusing(append(newForm.OverspendLimits, editForm.OverspendLimits...)) {
		limits = append(limits, l.Budget.Type+" "+l.Budget.Name+" "+l.LeftToPlan.Format())
	}
	want := []string{"campaign Helix launch 100.00 USD", "campaign Helix launch 100.00 USD"}
	if diff := cmp.Diff(want, limits); diff != "" || len(refusing(before.OverspendLimits)) != 0 ||
		len(refusing(outside.OverspendLimits)) != 0 {
		t.Errorf("037 FR-014 limits (-want +got):\n%s before %v, outside %v", diff, before.OverspendLimits, outside.OverspendLimits)
	}
}

// refusing keeps the Refuse budgets: since demo-mvp #3 the form lists Warn budgets above the activity too.
func refusing(limits []overspend.Limit) []overspend.Limit {
	kept := []overspend.Limit{}
	for _, l := range limits {
		if l.Mode == overspend.Refuse {
			kept = append(kept, l)
		}
	}
	return kept
}
