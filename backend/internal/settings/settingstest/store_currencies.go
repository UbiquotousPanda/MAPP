package settingstest

import (
	"context"
	"encoding/json"
	"maps"
	"slices"
	"strings"

	"mapp/internal/platform/fake"
	"mapp/internal/settings"
)

func (s Store) GetCurrency(_ context.Context, code string) (settings.Currency, bool, error) {
	return s.currencies.Get(code)
}

func (s Store) ListCurrencies(context.Context) ([]settings.Currency, error) {
	return s.currencies.List()
}

func (s Store) PutCurrency(ctx context.Context, c settings.Currency) error {
	return s.currencies.Put(ctx, c)
}

func (s Store) DeleteCurrency(ctx context.Context, code string) error {
	return s.currencies.Delete(ctx, code)
}

func (s Store) GetRate(_ context.Context, id string) (settings.ExchangeRate, bool, error) {
	return s.rates.Get(id)
}

func (s Store) ListRates(context.Context) ([]settings.ExchangeRate, error) {
	return s.rates.List()
}

// RatesOf lists oldest date first; the stable sort keeps Where's id order within a date, as the SQL does.
func (s Store) RatesOf(_ context.Context, code string) ([]settings.ExchangeRate, error) {
	rates, err := s.rates.Where(func(r settings.ExchangeRate) bool { return r.Currency == code })
	slices.SortStableFunc(rates, func(a, b settings.ExchangeRate) int { return a.Date.Compare(b.Date) })
	return rates, err
}

func (s Store) PutRate(ctx context.Context, r settings.ExchangeRate) error {
	return s.rates.Put(ctx, r)
}

func (s Store) PutRates(ctx context.Context, rates []settings.ExchangeRate) error {
	return s.rates.Put(ctx, rates...)
}

func (s Store) DeleteRate(ctx context.Context, id string) error {
	return s.rates.Delete(ctx, id)
}

func (s Store) PutRateImport(ctx context.Context, i settings.RateImport) error {
	return s.imports.Put(ctx, i)
}

func (s Store) GetRateImport(_ context.Context, id string) (settings.RateImport, bool, error) {
	return s.imports.Get(id)
}

func (s Store) ListRateImports(context.Context) ([]settings.RateImport, error) {
	return s.imports.List()
}

func (s Store) CurrencyUses(context.Context) ([]settings.CurrencyUse, error) {
	return currencyUses(s.db)
}

// currencyUses counts amounts per currency in the performance facts and GSAP transactions of the DB, as the query does.
func currencyUses(db *fake.DB) ([]settings.CurrencyUse, error) {
	var uses []settings.CurrencyUse
	for _, table := range []struct{ name, kind string }{
		{"performance_facts", settings.UseOfPerformanceFact}, {"financial_transactions", settings.UseOfFinancialTransaction},
	} {
		counts := map[string]int{}
		for _, data := range db.Encoded(table.name) {
			var row struct {
				Currency string          `json:"currency"`
				Amount   json.RawMessage `json:"amount"`
			}
			if err := json.Unmarshal(data, &row); err != nil {
				return nil, err
			}
			if strings.HasPrefix(string(row.Amount), "{") { // a performance fact's amount is money with its currency
				if err := json.Unmarshal(row.Amount, &row); err != nil {
					return nil, err
				}
			}
			if row.Currency != "" {
				counts[row.Currency]++
			}
		}
		for _, currency := range slices.Sorted(maps.Keys(counts)) {
			uses = append(uses, settings.CurrencyUse{Kind: table.kind, Currency: currency, Count: counts[currency]})
		}
	}
	return uses, nil
}
