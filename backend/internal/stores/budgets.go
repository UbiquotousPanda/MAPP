package stores

import "mapp/internal/modules/budget"

// BudgetStore is the budgets store as the wiring and the seed use it: the service's Store and what other areas' adapters call.
type BudgetStore interface {
	budget.Store
}
