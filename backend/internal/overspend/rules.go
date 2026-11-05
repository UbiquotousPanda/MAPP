package overspend

import (
	"cmp"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

const (
	CodeOverBudget  = "over_budget"
	MsgChooseMode   = "Choose Warn or Refuse."
	MsgTolerance    = "Enter a whole per cent from 0 to 100."
	maxTolerancePct = 100
	percentHundred  = 100

	msgPhrase   = "the planned cost of %s '%s' would be %s, over its budget of %s by %s"
	msgOneOwner = "Not saved — %s. Its owner refuses overspending."
	msgOwners   = "Not saved — %s. Their owners refuse overspending."
)

// ParseMode reads a mode a request sends; false for anything but "warn" and "refuse".
func ParseMode(text string) (Mode, bool) {
	switch Mode(text) {
	case Warn, Refuse:
		return Mode(text), true
	}
	return Warn, false
}

type budgetKey struct {
	kind Kind
	id   string
}

func keyOf(b Budget) budgetKey {
	return budgetKey{kind: b.Kind, id: b.ID}
}

// Allowance is tolerancePercent of a, rounded down to the cent: how far over a a Refuse budget lets planned
// cost go.
func Allowance(a money.Amount, tolerancePercent int) money.Amount {
	return money.FromCents(a.Cents() * int64(tolerancePercent) / percentHundred)
}

// ValidTolerance is a tolerance the setting takes: a whole per cent from 0 to 100.
func ValidTolerance(percent int) bool {
	return percent >= 0 && percent <= maxTolerancePct
}

// Overages lists the budgets set to Refuse that a save took over by more than the tolerance (FR-009, FR-011,
// research R2): beyond it after the save, and either new (no budget before) or with more planned
// cost or a smaller amount than before. Within the tolerance a save only warns.
func Overages(before, after []Budget, tolerancePercent int) []Overage {
	known := make(map[budgetKey]Budget, len(before))
	for _, b := range before {
		known[keyOf(b)] = b
	}
	overages := []Overage{}
	for _, b := range after {
		if !b.Mode.Refuses() || !isBeyond(b, tolerancePercent) {
			continue
		}
		if was, found := known[keyOf(b)]; found && !isWorse(was, b) {
			continue
		}
		overages = append(overages, overageOf(b))
	}
	slices.SortFunc(overages, byLevelAndName)
	return overages
}

func isBeyond(b Budget, tolerancePercent int) bool {
	return b.Planned.Amount.Cmp(b.Amount.Amount.Add(Allowance(b.Amount.Amount, tolerancePercent))) > 0
}

func isWorse(was, now Budget) bool {
	return now.Planned.Amount.Cmp(was.Planned.Amount) > 0 || now.Amount.Amount.Cmp(was.Amount.Amount) < 0
}

func overageOf(b Budget) Overage {
	over := money.Money{Amount: b.Planned.Amount.Sub(b.Amount.Amount), Currency: b.Amount.Currency}
	return Overage{Budget: refOf(b), Amount: b.Amount, PlannedCost: b.Planned, OverBy: over}
}

func refOf(b Budget) errs.RecordRef {
	return errs.RecordRef{Type: string(b.Kind), ID: b.ID, Name: b.Name}
}

func byLevelAndName(x, y Overage) int {
	return cmp.Or(cmp.Compare(kindOrder[Kind(x.Budget.Type)], kindOrder[Kind(y.Budget.Type)]),
		strings.Compare(x.Budget.Name, y.Budget.Name), strings.Compare(x.Budget.ID, y.Budget.ID))
}

// Refusal is the answer of a refused save, 409 over_budget, naming every budget it would take over (FR-010).
func Refusal(overages []Overage) *errs.Error {
	phrases := make([]string, 0, len(overages))
	for _, o := range overages {
		phrases = append(phrases, fmt.Sprintf(msgPhrase, kindWords[Kind(o.Budget.Type)], o.Budget.Name,
			o.PlannedCost.Format(), o.Amount.Format(), o.OverBy.Format()))
	}
	format := msgOneOwner
	if len(phrases) > 1 {
		format = msgOwners
	}
	message := fmt.Sprintf(format, strings.Join(phrases, "; "))
	return &errs.Error{Status: http.StatusConflict, Code: CodeOverBudget, Message: message, Fields: []errs.FieldError{}}
}

// LimitsOf returns every budget on path, Warn or Refuse, with what is left to plan in each and, for Refuse, what
// is left before it refuses, in the plan currency (FR-014); a global budget's is converted
// from USD at rates.
func LimitsOf(budgets []Budget, path Path, rates money.Rates, tolerancePercent int) ([]Limit, error) {
	limits := []Limit{}
	for _, b := range budgets {
		if !isOnPath(b, path) {
			continue
		}
		mode := b.Mode.Normalised()
		left := b.Amount.Amount.Sub(b.Planned.Amount)
		beforeRefusing := left
		if mode.Refuses() {
			beforeRefusing = left.Add(Allowance(b.Amount.Amount, tolerancePercent))
		}
		inPlan := func(a money.Amount) (money.Money, error) {
			return converted(money.Money{Amount: a, Currency: b.Amount.Currency}, path.PlanCurrency, rates)
		}
		leftMoney, err := inPlan(left)
		if err != nil {
			return nil, err
		}
		beforeMoney, err := inPlan(beforeRefusing)
		if err != nil {
			return nil, err
		}
		limits = append(limits, Limit{Budget: refOf(b), Mode: mode, Amount: b.Amount, LeftToPlan: leftMoney,
			LeftBeforeRefusing: beforeMoney})
	}
	slices.SortFunc(limits, func(x, y Limit) int {
		return byLevelAndName(Overage{Budget: x.Budget}, Overage{Budget: y.Budget})
	})
	return limits, nil
}

func converted(m money.Money, currency string, rates money.Rates) (money.Money, error) {
	if m.Currency == currency {
		return m, nil
	}
	return rates.Convert(m, currency)
}

func isOnPath(b Budget, path Path) bool {
	switch b.Kind {
	case KindPlan:
		return b.ID == path.PlanID
	case KindCampaign:
		return b.ID == path.CampaignID
	case KindInitiative:
		return b.ID == path.InitiativeID
	case KindGlobalBudget:
		return slices.Contains(b.PlanIDs, path.PlanID)
	}
	return false
}
