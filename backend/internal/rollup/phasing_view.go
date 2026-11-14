package rollup

import "mapp/internal/platform/money"

type PhasingMonthView struct {
	Month  string      `json:"month"`
	Amount money.Money `json:"amount"`
}

// PhasingView is a phasing in the plan currency (contract BudgetPhasing); Evenly is the budget split evenly for the editor.
type PhasingView struct {
	Method  PhasingMethod      `json:"method"`
	Months  []PhasingMonthView `json:"months"`
	Monthly []money.Money      `json:"monthly"`
	Total   *money.Money       `json:"total"`
	Problem *string            `json:"problem"`
	Evenly  []money.Money      `json:"evenly"`
}

// ViewOf returns the phasing p of a record with budget in a plan of year, in the plan currency.
func ViewOf(p Phasing, budget *money.Amount, year int, currency string) PhasingView {
	p = p.Normalised()
	view := PhasingView{Method: p.Method, Months: []PhasingMonthView{}, Monthly: []money.Money{}, Evenly: []money.Money{}}
	if budget != nil {
		for _, a := range budget.SplitEvenly(12) {
			view.Evenly = append(view.Evenly, money.Money{Amount: a, Currency: currency})
		}
	}
	for _, m := range p.Months {
		view.Months = append(view.Months, PhasingMonthView{Month: m.Month, Amount: money.Money{Amount: m.Amount, Currency: currency}})
	}
	if amounts := p.MonthAmounts(budget, year); amounts != nil {
		for _, a := range amounts {
			view.Monthly = append(view.Monthly, money.Money{Amount: a, Currency: currency})
		}
		total := money.Money{Amount: money.Sum(amounts...), Currency: currency}
		view.Total = &total
	}
	if problem := PhasingProblem(p, budget, year, currency); problem != nil {
		view.Problem = &problem.Reason
	}
	return view
}
