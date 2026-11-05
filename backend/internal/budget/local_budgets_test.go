package budget

import (
	"testing"
)

// Someone who sees global budgets for All markets sees every local budget the global budget funds, with
// its committed and actual figures, read-only and without a link where the plan is outside their scope; no
// Other markets row (demo-mvp #2).
func TestGet_AllMarketsSeesEveryLocalBudget(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	demo := f.demo(t)
	f.spending[planEurope] = Spend{Committed: *amount(t, "400000.00"), Actual: *amount(t, "250000.00")}
	f.spending[planChina] = Spend{Committed: *amount(t, "100000.00"), Actual: *amount(t, "50000.00")}
	access := priyasAccess()
	access.allViews = true
	access.noFinance = map[string]bool{planChina: true}
	f.as(access)

	view, err := f.service.Get(t.Context(), priya, demo.ID)

	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if view.OtherMarkets != nil {
		t.Errorf("other markets = %+v, want none: she sees every market", view.OtherMarkets)
	}
	if len(view.Allocations) != 2 {
		t.Fatalf("rows = %v, want Europe and China", rowsText(view.Allocations))
	}
	europe, china := view.Allocations[0], view.Allocations[1]
	if europe.Committed == nil || europe.Committed.Amount.String() != "400000.00" || europe.Actual == nil ||
		europe.Actual.Amount.String() != "250000.00" || europe.Actual.Currency != "USD" || !europe.CanOpenPlan {
		t.Errorf("Europe = committed %+v actual %+v open %t, want 400,000.00 and 250,000.00 USD, a link",
			europe.Committed, europe.Actual, europe.CanOpenPlan)
	}
	if china.Plan.ID != planChina || china.CanOpenPlan || china.Access.Edit.Available || china.Access.Remove.Available {
		t.Errorf("China = %+v, want it read-only without a link", china)
	}
	if china.Committed != nil || china.Actual != nil {
		t.Errorf("China committed %+v actual %+v, want none: she doesn't see its finance", china.Committed, china.Actual)
	}
}

// Managing allocations everywhere doesn't let someone change one for a plan they can't open: the server
// would answer that the allocation is gone (demo-mvp #2).
func TestGet_AllMarketsCannotChangeAPlanTheyCannotOpen(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	demo := f.demo(t)
	access := priyasAccess()
	access.allViews = true
	access.manageIn = map[string]error{}
	f.as(access)

	view, err := f.service.Get(t.Context(), priya, demo.ID)

	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	china := view.Allocations[1]
	if china.CanOpenPlan || china.Access.Edit.Available || china.Access.Remove.Available || china.Access.Edit.Reason == "" {
		t.Errorf("China access = %+v open %t, want change and remove unavailable with a reason", china.Access, china.CanOpenPlan)
	}
}
