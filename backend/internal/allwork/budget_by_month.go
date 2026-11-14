package allwork

import (
	"context"
	"fmt"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/date"
	"mapp/internal/platform/errs"
	"mapp/internal/platform/money"
)

// The planned cost by month follows Budget & cost: line items by their spread, a positive
// unassigned balance spread evenly over its activity's months, a negative one never.

const msgPlanGone = "This plan no longer exists — someone may have deleted it."

type BudgetByMonth struct {
	PlanID   string             `json:"planId"`
	Year     int                `json:"year"`
	Currency string             `json:"currency"`
	Months   []string           `json:"months"` // 2027-01 … 2027-12
	Rows     []BudgetByMonthRow `json:"rows"`   // the plan, then each campaign followed by its initiatives
}

type BudgetByMonthRow struct {
	RecordType        Level         `json:"recordType"`
	RecordID          string        `json:"recordId"`
	ParentID          *string       `json:"parentId"`
	Name              string        `json:"name"`
	Method            string        `json:"method"`
	Months            PhasedPeriods `json:"months"`
	Quarters          PhasedPeriods `json:"quarters"`
	OtherYears        *money.Money  `json:"otherYears"` // planned cost outside the plan's year; null when none
	NoDates           *money.Money  `json:"noDates"`    // planned cost of activities without dates; null when none
	ChildrenNotPhased int           `json:"childrenNotPhased"`

	NegativeBalanceCount int `json:"negativeBalanceCount"`
}

type PhasedPeriods struct {
	Budget      []*money.Money  `json:"budget"` // null entries when not phased
	PlannedCost []money.Money   `json:"plannedCost"`
	Difference  []*money.Money  `json:"difference"` // budget − planned cost; null entries when not phased
	Allocated   *[]*money.Money `json:"allocated"`  // plans and campaigns: the children's phased budgets; null for initiatives
	Over        []bool          `json:"over"`       // planned cost or allocated above the phased budget
	OverBy      []*money.Money  `json:"overBy"`     // how far the larger of the two is above it; null when not over
	Totals      PeriodTotals    `json:"totals"`
}

// PeriodTotals add up a row's periods; the planned cost includes other years and activities without dates.
type PeriodTotals struct {
	Budget      *money.Money `json:"budget"`
	PlannedCost money.Money  `json:"plannedCost"`
	Difference  *money.Money `json:"difference"`
	Allocated   *money.Money `json:"allocated"`
}

const methodNone = "none"

func (s *Service) BudgetByMonth(ctx context.Context, a actor.Actor, planID string) (BudgetByMonth, error) {
	var result BudgetByMonth
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		location, found, err := s.src.Locate(ctx, planID)
		if err != nil {
			return err
		}
		if !found || location.Level != LevelPlan {
			return errs.NotFound(msgPlanGone)
		}
		data, err := s.src.PlanYear(ctx, planID, location.Year, date.Today(s.now()))
		if err != nil {
			return err
		}
		var nodes []Node
		for _, n := range data.Nodes {
			if n.PlanID == planID {
				nodes = append(nodes, n)
			}
		}
		if len(nodes) == 0 {
			return errs.NotFound(msgPlanGone)
		}
		result = budgetByMonth(buildTree(nodes), location.Year)
		return nil
	})
	if err != nil {
		return BudgetByMonth{}, err
	}
	return result, nil
}

func budgetByMonth(t *tree, year int) BudgetByMonth {
	plan := t.plans[0]
	currency := plan.n.PlanCurrency
	if currency == "" {
		currency = money.BaseCurrency
	}
	keys := monthKeysOf(year)
	result := BudgetByMonth{PlanID: plan.n.ID, Year: year, Currency: currency, Months: keys, Rows: []BudgetByMonthRow{}}
	planned := map[*tnode]buckets{}
	plannedByMonth(plan, keys, planned)
	add := func(n *tnode) {
		result.Rows = append(result.Rows, phasedRow(n, planned[n], keys, currency))
	}
	add(plan)
	for _, c := range plan.children {
		if c.n.Level != LevelCampaign {
			continue
		}
		add(c)
		for _, i := range c.children {
			if i.n.Level == LevelInitiative {
				add(i)
			}
		}
	}
	return result
}

func monthKeysOf(year int) []string {
	keys := make([]string, 0, 12)
	for m := 1; m <= 12; m++ {
		keys = append(keys, fmt.Sprintf("%04d-%02d", year, m))
	}
	return keys
}

func plannedByMonth(n *tnode, keys []string, out map[*tnode]buckets) buckets {
	own := buckets{}
	if n.n.Level == LevelActivity {
		var assigned money.Amount
		for _, li := range n.children {
			for _, m := range li.n.MonthsPlan {
				own.add(bucketIn(keys, m.Month), m.Amount)
			}
			if !li.n.UnspreadPlan.IsZero() {
				own.add(periodNoDates, li.n.UnspreadPlan)
			}
			if li.n.PlannedCostPlan != nil {
				assigned = assigned.Add(li.n.PlannedCostPlan.Amount)
			}
		}
		if n.n.PlannedCostPlan != nil {
			if balance := n.n.PlannedCostPlan.Amount.Sub(assigned); balance.Sign() > 0 {
				if len(n.n.Months) == 0 {
					own.add(periodNoDates, balance)
				} else {
					for i, part := range balance.SplitEvenly(len(n.n.Months)) {
						own.add(bucketIn(keys, n.n.Months[i]), part)
					}
				}
			}
		}
		return own
	}
	for _, c := range n.children {
		own.addAll(plannedByMonth(c, keys, out))
	}
	out[n] = own
	return own
}

func negativeBelow(n *tnode) int {
	if n.n.Level != LevelActivity {
		count := 0
		for _, c := range n.children {
			count += negativeBelow(c)
		}
		return count
	}
	var assigned money.Amount
	for _, li := range n.children {
		if li.n.PlannedCostPlan != nil {
			assigned = assigned.Add(li.n.PlannedCostPlan.Amount)
		}
	}
	if n.n.PlannedCostPlan == nil || assigned.Cmp(n.n.PlannedCostPlan.Amount) <= 0 {
		return 0
	}
	return 1
}

func bucketIn(keys []string, month string) string {
	for _, k := range keys {
		if k == month {
			return month
		}
	}
	return periodOther
}

func phasedRow(n *tnode, planned buckets, keys []string, currency string) BudgetByMonthRow {
	row := BudgetByMonthRow{RecordType: n.n.Level, RecordID: n.n.ID, Name: n.n.Name, Method: methodNone,
		NegativeBalanceCount: negativeBelow(n)}
	if n.parent != nil {
		parent := n.parent.n.ID
		row.ParentID = &parent
	}
	row.Method = n.n.PhasingMethod
	if row.Method == "" {
		row.Method = methodNone
	}
	inPlan := func(a money.Amount) money.Money { return money.Money{Amount: a, Currency: currency} }

	budget := n.n.PhasedPlan // 12 or nil
	plannedMonths := make([]money.Amount, 12)
	for i, k := range keys {
		plannedMonths[i] = planned[k]
	}
	var allocated []money.Amount // nil: initiatives, or no child phased
	childLevel := LevelCampaign
	if n.n.Level == LevelCampaign {
		childLevel = LevelInitiative
	}
	if n.n.Level != LevelInitiative {
		for _, c := range n.children {
			if c.n.Level != childLevel {
				continue
			}
			if len(c.n.PhasedPlan) != 12 {
				row.ChildrenNotPhased++
				continue
			}
			if allocated == nil {
				allocated = make([]money.Amount, 12)
			}
			for i, a := range c.n.PhasedPlan {
				allocated[i] = allocated[i].Add(a)
			}
		}
	}
	row.Months = periodsOfMonths(budget, plannedMonths, allocated, n.n.Level != LevelInitiative, 1, inPlan)
	row.Quarters = periodsOfMonths(budget, plannedMonths, allocated, n.n.Level != LevelInitiative, 3, inPlan)
	for _, period := range []string{periodOther, periodNoDates} {
		a, found := planned[period]
		if !found || a.IsZero() {
			continue
		}
		m := inPlan(a)
		if period == periodOther {
			row.OtherYears = &m
		} else {
			row.NoDates = &m
		}
		row.Months.Totals.PlannedCost.Amount = row.Months.Totals.PlannedCost.Amount.Add(a)
		row.Quarters.Totals.PlannedCost.Amount = row.Quarters.Totals.PlannedCost.Amount.Add(a)
	}
	return row
}

func periodsOfMonths(budget, planned, allocated []money.Amount, hasAllocated bool, size int,
	inPlan func(money.Amount) money.Money) PhasedPeriods {
	n := 12 / size
	p := PhasedPeriods{Budget: make([]*money.Money, n), PlannedCost: make([]money.Money, n), Difference: make([]*money.Money, n),
		Over: make([]bool, n), OverBy: make([]*money.Money, n)}
	var alloc []*money.Money
	if hasAllocated {
		alloc = make([]*money.Money, n)
		p.Allocated = &alloc
	}
	for i := range n {
		b, c, al := sumOf(budget, i, size), sumOf(planned, i, size), sumOf(allocated, i, size)
		p.PlannedCost[i] = inPlan(c)
		if allocated != nil {
			m := inPlan(al)
			alloc[i] = &m
		}
		if budget == nil {
			continue
		}
		bm, diff := inPlan(b), inPlan(b.Sub(c))
		p.Budget[i], p.Difference[i] = &bm, &diff
		p.Over[i] = c.Cmp(b) > 0 || (allocated != nil && al.Cmp(b) > 0)
		if p.Over[i] {
			by := inPlan(money.FromCents(max(c.Sub(b).Cents(), al.Sub(b).Cents())))
			p.OverBy[i] = &by
		}
	}
	p.Totals = totalsOf(budget, planned, allocated, inPlan)
	return p
}

func sumOf(months []money.Amount, period, size int) money.Amount {
	var sum money.Amount
	if months == nil {
		return sum
	}
	for m := period * size; m < (period+1)*size; m++ {
		sum = sum.Add(months[m])
	}
	return sum
}

func totalsOf(budget, planned, allocated []money.Amount, inPlan func(money.Amount) money.Money) PeriodTotals {
	t := PeriodTotals{PlannedCost: inPlan(money.Sum(planned...))}
	if budget != nil {
		b := inPlan(money.Sum(budget...))
		d := inPlan(b.Amount.Sub(t.PlannedCost.Amount))
		t.Budget, t.Difference = &b, &d
	}
	if allocated != nil {
		a := inPlan(money.Sum(allocated...))
		t.Allocated = &a
	}
	return t
}
