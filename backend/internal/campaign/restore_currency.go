package campaign

import (
	"context"
	"fmt"

	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

const restoreCurrencyMessage = "Can't restore '%s' — its budget is in %s, but the plan's currency is now %s."

// checkBudgetCurrency keeps every amount of a plan in its plan currency when a record comes back.
func (s *Service) checkBudgetCurrency(ctx context.Context, name, planID string, budget *money.Money) error {
	if budget == nil {
		return nil
	}
	plan, found, err := s.deps.Plans.Plan(ctx, planID)
	if err != nil || !found || budget.Currency == plan.Currency {
		return err
	}
	return errs.CannotRestore(fmt.Sprintf(restoreCurrencyMessage, name, budget.Currency, plan.Currency))
}

func (s *Service) checkInitiativeBudgetCurrency(ctx context.Context, i Initiative) error {
	c, found, err := s.repo.GetCampaign(ctx, i.CampaignID)
	if err != nil || !found {
		return err
	}
	return s.checkBudgetCurrency(ctx, i.Name, c.PlanID, i.Budget)
}
