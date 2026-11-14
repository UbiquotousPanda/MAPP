// Package rollup is the published contract of the rollup module: the types, ports and constructors that
// cross its boundary. The module's own code sits under internal/, out of reach (ADR-0022).
package rollup

import (
	"mapp/internal/modules/history"
	"mapp/internal/modules/rollup/internal/core"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

type (
	BudgetAndCost     = core.BudgetAndCost
	Goals             = core.Goals
	Phasing           = core.Phasing
	PhasingInput      = core.PhasingInput
	PhasingMethod     = core.PhasingMethod
	PhasingMonth      = core.PhasingMonth
	PhasingMonthInput = core.PhasingMonthInput
	PhasingView       = core.PhasingView
	Progress          = core.Progress
)

const (
	MethodCustom = core.MethodCustom
	MethodEvenly = core.MethodEvenly
	MethodNone   = core.MethodNone
)

var (
	NotPhased = core.NotPhased //nolint:gochecknoglobals // re-exports core.NotPhased, which nothing reassigns
)

func AddGoals(goals []Goals) Goals {
	return core.AddGoals(goals)
}

func ApprovalProgress(approved, total int) Progress {
	return core.ApprovalProgress(approved, total)
}

func BudgetUsedPercent(planned, budget *money.Money) *int {
	return core.BudgetUsedPercent(planned, budget)
}

func ContainerIn(currency string, budget *money.Money, childBudgets []*money.Money, plannedCost *money.Money) BudgetAndCost {
	return core.ContainerIn(currency, budget, childBudgets, plannedCost)
}

func DescribePhasing(field string, value any) (label, text string, ok bool) {
	return core.DescribePhasing(field, value)
}

func LeftToPlan(budget, planned *money.Money) *money.Money {
	return core.LeftToPlan(budget, planned)
}

func MoneyText(value any) string {
	return core.MoneyText(value)
}

func MonthKeys(year int) []string {
	return core.MonthKeys(year)
}

func OverBudget(planned, budget *money.Money) bool {
	return core.OverBudget(planned, budget)
}

func OverBy(remaining *money.Money) *money.Money {
	return core.OverBy(remaining)
}

func ParsePhasing(in PhasingInput, budget *money.Amount, year int) (Phasing, errs.Problems) {
	return core.ParsePhasing(in, budget, year)
}

func PhasingChanges( //nolint:revive // argument-limit: mirrors core.PhasingChanges, six values of one change
	before, after Phasing, budgetBefore, budgetAfter *money.Amount, year int, currency string,
) []history.Change {
	return core.PhasingChanges(before, after, budgetBefore, budgetAfter, year, currency)
}

func PhasingOf(method string, months []string, amounts []int64) Phasing {
	return core.PhasingOf(method, months, amounts)
}

func PhasingProblem(p Phasing, budget *money.Amount, year int, currency string) *errs.MissingField {
	return core.PhasingProblem(p, budget, year, currency)
}

func Remaining(budget *money.Money, allocated money.Money) *money.Money {
	return core.Remaining(budget, allocated)
}

func ShiftPhasing(p Phasing, years int) Phasing {
	return core.ShiftPhasing(p, years)
}

func Sum(amounts []*money.Money) *money.Money {
	return core.Sum(amounts)
}

func Timing(start, end *date.Date, today date.Date) string {
	return core.Timing(start, end, today)
}

func Total(amounts []*money.Money) money.Money {
	return core.Total(amounts)
}

func TotalIn(currency string, amounts []*money.Money) money.Money {
	return core.TotalIn(currency, amounts)
}

func ViewOf(p Phasing, budget *money.Amount, year int, currency string) PhasingView {
	return core.ViewOf(p, budget, year, currency)
}
