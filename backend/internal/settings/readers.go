package settings

import (
	"context"
	"slices"

	"mapp/internal/platform/money"
)

// The readers take no actor and read inside the caller's transaction when ctx carries one, so a check and the
// save that follows see the same Settings. They never return records in the recycle bin.

func (s *Service) Model(ctx context.Context, id string) (Model, bool, error) {
	return get(ctx, s, func(ctx context.Context) (Model, bool, error) {
		m, found, err := s.repo.GetModel(ctx, id)
		return m.Normalised(), found, err
	})
}

func (s *Service) Models(ctx context.Context) ([]Model, error) {
	return list(ctx, s, s.repo.ListModels, func(a, b Model) int { return compareNames(a.Name, b.Name) })
}

func (s *Service) ActivityType(ctx context.Context, id string) (ActivityType, bool, error) {
	return get(ctx, s, func(ctx context.Context) (ActivityType, bool, error) { return s.repo.GetActivityType(ctx, id) })
}

func (s *Service) ActivityTypes(ctx context.Context) ([]ActivityType, error) {
	return list(ctx, s, s.repo.ListActivityTypes, func(a, b ActivityType) int { return compareNames(a.Name, b.Name) })
}

func (s *Service) Attributes(ctx context.Context, level Level) ([]Attribute, error) {
	var attributes []Attribute
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		all, err := s.repo.ListAttributes(ctx)
		attributes = ofLevel(all, level)
		return err
	})
	return attributes, err
}

func (s *Service) Options(ctx context.Context, attributeID string) ([]Option, error) {
	return list(ctx, s, func(ctx context.Context) ([]Option, error) { return s.repo.OptionsOf(ctx, attributeID) }, compareOptions)
}

func (s *Service) Option(ctx context.Context, id string) (Option, bool, error) {
	return get(ctx, s, func(ctx context.Context) (Option, bool, error) { return s.repo.GetOption(ctx, id) })
}

func (s *Service) Currency(ctx context.Context, code string) (Currency, bool, error) {
	return get(ctx, s, func(ctx context.Context) (Currency, bool, error) {
		c, found, err := s.repo.GetCurrency(ctx, code)
		if err != nil || !found {
			return c, found, err
		}
		book, err := s.rateBook(ctx)
		return withRate(c, book, s.today()), true, err
	})
}

func (s *Service) Currencies(ctx context.Context) ([]Currency, error) {
	return list(ctx, s, s.currenciesWithRates, compareCurrencies)
}

func (s *Service) currenciesWithRates(ctx context.Context) ([]Currency, error) {
	currencies, err := s.repo.ListCurrencies(ctx)
	if err != nil {
		return nil, err
	}
	book, err := s.rateBook(ctx)
	if err != nil {
		return nil, err
	}
	today := s.today()
	for i, c := range currencies {
		currencies[i] = withRate(c, book, today)
	}
	return currencies, nil
}

// Rates returns the latest dated rate on or before today of every currency, for conversions at read time.
func (s *Service) Rates(ctx context.Context) (money.Rates, error) {
	currencies, err := s.Currencies(ctx)
	if err != nil {
		return nil, err
	}
	rates := money.Rates{}
	for _, c := range currencies {
		rates[c.Code] = c.Rate
	}
	return rates, nil
}

func (s *Service) FinanceBudget(ctx context.Context, id string) (FinanceBudget, bool, error) {
	return get(ctx, s, func(ctx context.Context) (FinanceBudget, bool, error) { return s.repo.GetFinanceBudget(ctx, id) })
}

// FinanceBudgetsOfYear leaves out budgets without items: they are not offered for new choices.
func (s *Service) FinanceBudgetsOfYear(ctx context.Context, year int) ([]FinanceBudget, error) {
	var budgets []FinanceBudget
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		all, err := s.repo.ListFinanceBudgets(ctx)
		if err != nil {
			return err
		}
		items, err := s.repo.ListFinanceBudgetItems(ctx)
		if err != nil {
			return err
		}
		hasItems := map[string]bool{}
		for _, i := range items {
			hasItems[i.BudgetID] = true
		}
		budgets = filter(all, func(b FinanceBudget) bool { return b.Year == year && hasItems[b.ID] })
		slices.SortStableFunc(budgets, func(a, b FinanceBudget) int { return compareNames(a.Name, b.Name) })
		return nil
	})
	return budgets, err
}

func (s *Service) FinanceBudgetItem(ctx context.Context, id string) (FinanceBudgetItem, bool, error) {
	return get(ctx, s, func(ctx context.Context) (FinanceBudgetItem, bool, error) {
		return s.repo.GetFinanceBudgetItem(ctx, id)
	})
}

func (s *Service) FinanceBudgetItems(ctx context.Context, budgetID string) ([]FinanceBudgetItem, error) {
	return list(ctx, s, func(ctx context.Context) ([]FinanceBudgetItem, error) { return s.repo.ItemsOf(ctx, budgetID) },
		func(a, b FinanceBudgetItem) int { return compareNames(a.Name, b.Name) })
}

// CanChoose lets a record keep an inactive id it already has (previousID), but never newly choose one.
func CanChoose(active bool, id, previousID string) bool {
	return active || id == previousID
}

// Visible: an attribute with a condition shows only when the business unit includes one of its options. A
// hidden attribute keeps its value and is never missing.
func Visible(a Attribute, businessUnit []string) bool {
	if len(a.Condition) == 0 {
		return true
	}
	for _, optionID := range a.Condition {
		if slices.Contains(businessUnit, optionID) {
			return true
		}
	}
	return false
}

func get[T any](ctx context.Context, s *Service, read func(context.Context) (T, bool, error)) (T, bool, error) {
	var record T
	var found bool
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		var err error
		record, found, err = read(ctx)
		return err
	})
	return record, found, err
}

func list[T any](ctx context.Context, s *Service, read func(context.Context) ([]T, error), compare func(a, b T) int) ([]T, error) {
	var records []T
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		var err error
		records, err = read(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	slices.SortStableFunc(records, compare)
	return records, nil
}

func compareCurrencies(a, b Currency) int {
	switch {
	case a.Code == b.Code:
		return 0
	case a.Code == money.BaseCurrency:
		return -1
	case b.Code == money.BaseCurrency:
		return 1
	}
	return compareIDs(a.Code, b.Code)
}
