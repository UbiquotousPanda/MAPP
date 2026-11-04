package projection_test

import (
	"errors"
	"testing"

	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

func amounts(currency string, cents ...int64) []projection.MoneyFigure {
	months := make([]projection.MoneyFigure, 0, len(cents))
	for i, c := range cents {
		months = append(months, projection.MoneyFigure{Month: monthOf(i),
			Value: money.Money{Amount: money.FromCents(c), Currency: currency}})
	}
	return months
}

func TestSplitAmounts_ActualBeforeTodayProjectedFromIt_FR010(t *testing.T) {
	t.Parallel()
	actual := amounts(money.BaseCurrency, 100, 100, 100, 100, 100, 100, 40, 0, 0, 0, 0, 0)
	projected := amounts(money.BaseCurrency, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90)

	got, err := projection.SplitAmounts(actual, projected, date.MustParse("2026-07-15"), 2026)
	if err != nil {
		t.Fatalf("SplitAmounts in one currency: %v", err)
	}
	if got.Actual.Amount.Cents() != 600 || got.Projected.Amount.Cents() != 540 || got.Total.Amount.Cents() != 1140 ||
		got.Total.Currency != money.BaseCurrency {
		t.Errorf("split = %v + %v = %v, want 6.00 + 5.40 = 11.40 USD", got.Actual, got.Projected, got.Total)
	}
}

// A currency stamped onto amounts of another would misstate every figure, so the split refuses instead.
func TestSplitAmounts_RefusesActualAndProjectedInDifferentCurrencies_FR007(t *testing.T) {
	t.Parallel()
	actual := amounts(money.BaseCurrency, 100, 100, 100, 100, 100, 100, 40, 0, 0, 0, 0, 0)
	projected := amounts("EUR", 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90)

	got, err := projection.SplitAmounts(actual, projected, date.MustParse("2026-07-15"), 2026)
	if !errors.Is(err, projection.ErrMixedCurrencies) {
		t.Errorf("SplitAmounts(USD actuals, EUR projection) = %v, %v, want ErrMixedCurrencies, never one currency on both",
			got.Total, err)
	}
}
