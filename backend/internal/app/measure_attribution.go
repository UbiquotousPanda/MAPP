package app

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

// attributionArea serves Settings › Attribution (050, logged like other settings) and the deals panel's read (058).
func (w *wiring) attributionArea() error {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	service := attribution.NewService(tools, w.set.Attribution)
	if err := w.register(service.Kinds()); err != nil {
		return err
	}
	mount(w.signedIn, attribution.NewHandler(service))
	mount(w.signedIn, attribution.NewDealsHandler(w.deals()))
	return nil
}

func (w *wiring) crediting() *attribution.Crediting {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	return attribution.NewCrediting(attribution.NewService(tools, w.set.Attribution), w.set.Attribution, w.settings)
}

// deals is 058's read of the deals behind an activity's credit, served by its handler and by Revenue's export.
func (w *wiring) deals() *attribution.Deals {
	tools := history.Tools{Tx: w.set.Tx, IDs: w.generator, Log: w.history, Now: w.now}
	return attribution.NewDeals(attribution.DealsDeps{Tx: w.set.Tx, Settings: attribution.NewService(tools, w.set.Attribution),
		Store: w.set.Attribution, Rates: w.settings, Displays: displayCurrencies{reports: w.reports}, Now: w.now})
}

// displayCurrencies answers 058's Displays port with the report frame's own currency rule (039).
type displayCurrencies struct {
	reports *measure.Service
}

func (d displayCurrencies) Display(ctx context.Context, a actor.Actor, code string) (money.Display, error) {
	currency, err := d.reports.DisplayCurrency(ctx, a, code)
	if err != nil {
		return money.Display{}, err
	}
	return money.DisplayIn(currency.Code, currency.Rate.String()), nil
}
