package campaign

import (
	"errors"
	"strings"
	"testing"

	"mapp/internal/platform/errs"
)

func TestRestoreCampaign_RefusedOnceThePlanCurrencyChanged_BEH1(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	helix := f.createCampaign(t, priya, "P-1001", CampaignInput{Name: "Helix launch", Budget: input("300000.00")})
	entry, err := f.service.DeleteCampaign(t.Context(), priya, helix.ID)
	if err != nil {
		t.Fatalf("DeleteCampaign: %v", err)
	}
	plan := f.plans.plans["P-1001"]
	plan.Currency = "EUR"
	f.plans.plans["P-1001"] = plan

	_, err = f.history.Restore(t.Context(), priya, entry.ID)

	refusal, ok := errors.AsType[*errs.Error](err)
	if !ok || refusal.Code != errs.CodeCannotRestore || !strings.Contains(refusal.Message, "EUR") {
		t.Fatalf("Restore() error = %v, want cannot_restore naming the plan's currency now, EUR", err)
	}
	if _, found := f.storedCampaign(t, helix.ID); found {
		t.Error("the campaign came back with a USD budget in an EUR plan")
	}
}
