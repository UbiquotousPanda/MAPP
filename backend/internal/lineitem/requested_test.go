package lineitem

import (
	"context"
	"errors"
	"testing"

	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

type fakeRequested struct{ amount money.Amount }

func (f fakeRequested) Requested(context.Context, string, string) (money.Amount, []string, error) {
	return f.amount, []string{"PR-1001"}, nil
}

// A purchase request may go over its line item within the overspend tolerance, so a line item already
// below what is requested must still take a rename; only a lower planned cost is refused.
func TestUpdate_RequestedRuleOnlyWhenThePlannedCostChanges_DemoMVP4(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	fee := f.create(t, priya, launchFilm, input("Agency fee", "USD", "1000.00"))
	requested, _ := money.ParseAmount("1100.00")
	f.service.UsePurchaseRequests(fakeRequested{amount: requested})

	renamed := formOf(fee)
	renamed.Name = "Agency fee (UK)"
	view := f.update(t, priya, fee.ID, renamed)

	lower := formOf(view)
	lower.PlannedCost = text("900.00")
	_, err := f.service.Update(t.Context(), priya, fee.ID, lower)
	var refused *errs.Error
	if !errors.As(err, &refused) || len(refused.Fields) == 0 || refused.Fields[0].Field != "plannedCost" {
		t.Errorf("Update(planned cost 900.00) = %v, want a plannedCost problem: PR-1001 requests 1,100.00", err)
	}
}

// Planned 9,200 with 10,000 requested within the tolerance: a raise to 9,500 still leaves the line item below
// what is requested, yet only a lower planned cost or another currency is refused.
func TestUpdate_RaisingThePlannedCostBelowWhatIsRequestedIsSaved_DemoMVP3(t *testing.T) {
	t.Parallel()
	f := newTestService(t)
	fee := f.create(t, priya, launchFilm, input("Agency fee", "USD", "9200.00"))
	requested, _ := money.ParseAmount("10000.00")
	f.service.UsePurchaseRequests(fakeRequested{amount: requested})

	raised := formOf(fee)
	raised.PlannedCost = text("9500.00")
	view := f.update(t, priya, fee.ID, raised)

	if got := view.PlannedCost.Amount.Format(); got != "9,500.00" {
		t.Errorf("Update(planned cost 9,500.00) planned cost = %s, want 9,500.00", got)
	}
}
