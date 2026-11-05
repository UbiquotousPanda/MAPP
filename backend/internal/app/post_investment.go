package app

import (
	"context"
	"errors"

	"mapp/internal/activity"
	"mapp/internal/financials"
	"mapp/internal/history"
	"mapp/internal/plan"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
	"mapp/internal/postinvestment"
	"mapp/internal/stores"
)

func (w *wiring) postInvestmentArea() error {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	s := postinvestment.NewService(tools, w.set.Reviews, reviewActivities{
		set: w.set, financials: w.financials, displays: financialDisplays{people: w.people}, rates: w.settings.Rates,
	})
	if err := w.register(s.Kinds()); err != nil {
		return err
	}
	mount(w.signedIn, postinvestment.NewHandler(s))
	return nil
}

// reviewActivities implements postinvestment.Activities over the planning stores and the financials.
type reviewActivities struct {
	set        stores.Set
	financials *financials.Service
	displays   financialDisplays
	rates      func(ctx context.Context) (money.Rates, error)
}

func (r reviewActivities) InScope(ctx context.Context, scope authz.Scope, ids []string) (map[string]postinvestment.Activity, error) {
	found := map[string]postinvestment.Activity{}
	if len(ids) == 0 {
		return found, nil
	}
	seen, err := r.set.Activities.ListInScopeOf(ctx, scope, ids)
	if err != nil {
		return nil, err
	}
	for _, a := range seen {
		act, known, err := r.activityOf(ctx, a)
		if err != nil {
			return nil, err
		}
		if known {
			found[a.ID] = act
		}
	}
	return found, nil
}

func (r reviewActivities) activityOf(ctx context.Context, a activity.Activity) (postinvestment.Activity, bool, error) {
	i, found, err := r.set.Campaigns.GetInitiative(ctx, a.InitiativeID)
	if err != nil || !found {
		return postinvestment.Activity{}, false, err
	}
	c, found, err := r.set.Campaigns.GetCampaign(ctx, i.CampaignID)
	if err != nil || !found {
		return postinvestment.Activity{}, false, err
	}
	p, found, err := r.set.Plans.Get(ctx, c.PlanID)
	if err != nil || !found {
		return postinvestment.Activity{}, false, err
	}
	approverIDs, err := namedApprovers(ctx, r.set.Approvals, a.ID)
	if err != nil {
		return postinvestment.Activity{}, false, err
	}
	path := []history.RecordRef{
		{Type: planKind, ID: p.ID, Name: p.Name}, {Type: campaignLevel, ID: c.ID, Name: c.Name},
		{Type: initiativeLevel, ID: i.ID, Name: i.Name},
	}
	facts := authz.ActivityFacts{Plan: plan.AccessFacts(p), OwnerID: a.OwnerID, ApproverIDs: approverIDs}
	return postinvestment.Activity{ID: a.ID, Name: a.Name, Path: path, Facts: facts}, true, nil
}

// Live reads the activity's figures as its Financials card shows them; a person who doesn't see the plan's
// finance gets none. The budget is the initiative's, as an activity has none of its own.
func (r reviewActivities) Live(ctx context.Context, a actor.Actor, activityID string) (postinvestment.Live, error) {
	display, err := r.displays.Display(ctx, a.ID)
	if err != nil {
		return postinvestment.Live{}, err
	}
	live := postinvestment.Live{Currency: display.Currency()}
	card, err := r.financials.Record(ctx, a, activityID)
	if hidden(err) {
		return live, nil
	}
	if err != nil {
		return postinvestment.Live{}, err
	}
	budget, err := r.initiativeBudget(ctx, display, card)
	if err != nil {
		return postinvestment.Live{}, err
	}
	f := card.Figures
	live.Figures = &postinvestment.Figures{Budget: budget, Planned: f.PlannedCost, Committed: f.Committed, Actual: f.Paid}
	return live, nil
}

func (r reviewActivities) initiativeBudget(ctx context.Context, display money.Display, card financials.RecordView) (*money.Money, error) {
	if len(card.Path) == 0 {
		return nil, nil
	}
	i, found, err := r.set.Campaigns.GetInitiative(ctx, card.Path[len(card.Path)-1].ID)
	if err != nil || !found || i.Budget == nil {
		return nil, err
	}
	rates, err := r.rates(ctx)
	if err != nil {
		return nil, err
	}
	converted := display.WithRates(rates).Money(*i.Budget)
	return &converted, nil
}

// KnownCurrency is a currency with a current rate in Settings; US dollars always are.
func (r reviewActivities) KnownCurrency(ctx context.Context, code string) (bool, error) {
	rates, err := r.rates(ctx)
	if err != nil {
		return false, err
	}
	_, err = rates.Of(code)
	return err == nil, nil
}

func hidden(err error) bool {
	var e *errs.Error
	return errors.As(err, &e) && (e.Code == errs.CodeNotFound || e.Code == errs.CodeForbidden)
}
