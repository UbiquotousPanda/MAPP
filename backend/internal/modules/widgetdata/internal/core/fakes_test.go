package core_test

import (
	"context"
	"testing"

	"mapp/internal/modules/widgetdata/internal/core"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

var viewer = actor.Actor{ID: "U-1009", Name: "Vera Viewer"}

func signedIn(t *testing.T, perms ...authz.Permission) context.Context {
	t.Helper()
	byRole := map[string][]authz.Permission{"RL-9": perms}
	roles := []authz.GrantedRole{{ID: "RL-9", Name: "Test", Scope: authz.ScopeAll}}
	return authz.With(t.Context(), authz.NewGrants(viewer.ID, roles, nil, byRole, nil, authz.Rules{}))
}

type fakeTx struct{}

func (fakeTx) Read(ctx context.Context, fn func(ctx context.Context) error) error { return fn(ctx) }

type fakeReader struct {
	rows  core.Rows
	asked []core.Prefilter
	who   []string
}

func (f *fakeReader) Rows(_ context.Context, a actor.Actor, p core.Prefilter) (core.Rows, error) {
	f.asked = append(f.asked, p)
	f.who = append(f.who, a.ID)
	return f.rows, nil
}

type fakeDatasets struct {
	tables map[string]core.Table
}

func (f fakeDatasets) Visible(_ context.Context, _ actor.Actor) ([]core.DatasetInfo, error) {
	out := []core.DatasetInfo{}
	for _, t := range f.tables {
		out = append(out, t.Info)
	}
	return out, nil
}

func (f fakeDatasets) Table(_ context.Context, _ actor.Actor, id string) (core.Table, error) {
	t, found := f.tables[id]
	if !found {
		return core.Table{}, errs.NotFound("This dataset doesn't exist.")
	}
	return t, nil
}

type fakeRates money.Rates

func (f fakeRates) Rates(context.Context) (money.Rates, error) { return money.Rates(f), nil }

func text(s string) core.Value { return core.TextValue(s) }

func usd(t *testing.T, s string) core.Value {
	t.Helper()
	a, err := money.ParseAmount(s)
	if err != nil {
		t.Fatalf("ParseAmount(%q): %v", s, err)
	}
	return core.MoneyValue(&a)
}

func service(readers map[string]core.SourceReader, datasets core.DatasetTables) *core.Service {
	rates := fakeRates{"EUR": money.RateFromMicros(500_000)}
	return core.NewService(fakeTx{}, core.Deps{Sources: readers, Datasets: datasets, Rates: rates})
}

func moneyText(c core.Cell) string {
	if c.Money == nil {
		return "—"
	}
	return c.Money.Format()
}
