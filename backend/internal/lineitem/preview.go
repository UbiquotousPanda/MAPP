package lineitem

import (
	"context"
	"fmt"
	"strings"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
	"mapp/internal/settings"
)

// PreviewInput is the line-item form as typed; LineItemID names the line item being edited, if any.
type PreviewInput struct {
	LineItemID  *string     `json:"lineItemId"`
	Currency    string      `json:"currency"`
	PlannedCost string      `json:"plannedCost"`
	Spread      SpreadInput `json:"spread"`
}

// Preview is what saving the form would give; an amount is nil while the text is not one or has no rate.
// BalanceIn is the unassigned planned cost without the line item edited, in the form's currency, for a pre-fill,
// and BalanceInPlan that amount back in the plan currency.
type Preview struct {
	PlannedCostUSD  *money.Money   `json:"plannedCostUsd"`
	PlannedCostPlan *money.Money   `json:"plannedCostPlan"`
	AfterSaving     *money.Money   `json:"afterSaving"`
	BalanceIn       *money.Money   `json:"balanceIn"`
	BalanceInPlan   *money.Money   `json:"balanceInPlan"`
	Spread          *SpreadPreview `json:"spread"`
}

// SpreadPreview is the spread as saved; Difference is the planned cost minus the custom months, and Seed the
// months a switch to Custom starts from: the months of this spread, or the cost evenly over the plan's year.
type SpreadPreview struct {
	State       string        `json:"state"`
	Months      []SpreadMonth `json:"months"`
	CustomTotal *money.Money  `json:"customTotal"`
	Difference  *money.Money  `json:"difference"`
	AddsUp      bool          `json:"addsUp"`
	Seed        []MonthAmount `json:"seed"`
}

type previewRates struct {
	currency settings.Currency
	plan     money.Rate
}

func (s *Service) Preview(ctx context.Context, _ actor.Actor, activityID string, in PreviewInput) (Preview, error) {
	var preview Preview
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		f, err := s.facts(ctx, activityID)
		if err != nil {
			return err
		}
		if ctx, err = s.withRates(ctx); err != nil {
			return err
		}
		rates, err := s.rates(ctx)
		if err != nil {
			return err
		}
		currency, known := rates.currencies[strings.TrimSpace(in.Currency)]
		if !known || currency.Rate.Micros() <= 0 {
			return nil
		}
		r := previewRates{currency: currency, plan: rates.rateOf(f.planCurrency())}
		others, err := s.otherItems(ctx, f, in.LineItemID)
		if err != nil {
			return err
		}
		preview = previewOf(f, in, r, others)
		return nil
	})
	return preview, err
}

func previewOf(f ActivityFacts, in PreviewInput, r previewRates, others []View) Preview {
	var preview Preview
	if balance := balanceOf(f, others).Balance; balance != nil {
		local := money.Money{Amount: money.Convert(balance.Amount, r.plan, r.currency.Rate), Currency: r.currency.Code}
		back := money.Money{Amount: money.Convert(local.Amount, r.currency.Rate, r.plan), Currency: f.planCurrency()}
		preview.BalanceIn, preview.BalanceInPlan = &local, &back
	}
	cost, message := parseAmount(in.PlannedCost, "")
	if message != "" {
		return preview
	}
	usd := money.USD(money.ToUSD(cost, r.currency.Rate))
	plan := money.Money{Amount: money.Convert(cost, r.currency.Rate, r.plan), Currency: f.planCurrency()}
	preview.PlannedCostUSD, preview.PlannedCostPlan = &usd, &plan
	preview.AfterSaving = afterSaving(f, others, plan.Amount)
	var problems errs.Problems
	li := LineItem{Currency: r.currency.Code, PlannedCost: cost, Spread: checkSpread(&problems, in.Spread, f.PlanYear)}
	if problems.Err() == nil {
		preview.Spread = spreadPreview(li, f, r)
	}
	return preview
}

func spreadPreview(li LineItem, f ActivityFacts, r previewRates) *SpreadPreview {
	view := spreadView(li, f, r.currency.Rate, r.plan)
	months, spread := SpreadMonths(li, f)
	p := &SpreadPreview{State: view.State, Months: view.Months, CustomTotal: view.CustomTotal, AddsUp: view.AddsUp, Seed: months}
	if view.CustomTotal != nil {
		d := money.Money{Amount: li.PlannedCost.Sub(view.CustomTotal.Amount), Currency: li.Currency}
		p.Difference = &d
	}
	if !spread {
		p.Seed = make([]MonthAmount, 0, 12)
		for i, part := range li.PlannedCost.SplitEvenly(12) {
			p.Seed = append(p.Seed, MonthAmount{Month: fmt.Sprintf("%04d-%02d", f.PlanYear, i+1), Amount: part})
		}
	}
	return p
}

func (s *Service) otherItems(ctx context.Context, f ActivityFacts, editedID *string) ([]View, error) {
	items, err := s.repo.ListByActivity(ctx, f.ID)
	if err != nil {
		return nil, err
	}
	views, err := s.views(ctx, f, items)
	if err != nil {
		return nil, err
	}
	others := make([]View, 0, len(views))
	for _, v := range views {
		if editedID == nil || v.ID != *editedID {
			others = append(others, v)
		}
	}
	return others, nil
}

// afterSaving is the unassigned planned cost with the line item at planned in the plan currency added to others.
func afterSaving(f ActivityFacts, others []View, planned money.Amount) *money.Money {
	amounts := []money.Amount{planned}
	currencies := make([]string, 0, len(others))
	for _, v := range others {
		amounts = append(amounts, v.PlannedCostPlan.Amount)
		currencies = append(currencies, v.Currency.Code)
	}
	return Balance(f, amounts, currencies).Balance
}
