package allwork

import (
	"context"
	"time"

	"mapp/internal/platform/authz"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
)

// Source is the only coupling to features 002–008 (D-196); it runs in the caller's transaction and computes no rule.
type Source interface {
	Years(ctx context.Context) ([]int, error)
	// Year may leave out values only columns not in columns show: the owning features work them out record by record.
	Year(ctx context.Context, year int, today date.Date, columns []string) (YearData, error)
	PlanYear(ctx context.Context, planID string, year int, today date.Date) (YearData, error)
	Choices(ctx context.Context, personID string) (Choices, error)
	Attributes(ctx context.Context) ([]Attribute, error)
	Currency(ctx context.Context, personID string) (Currency, error)
	Locate(ctx context.Context, recordID string) (Location, bool, error)
	InRecycleBin(ctx context.Context, recordID string) (bool, error)
	RatesUsed(ctx context.Context) ([]string, error)
}

type YearData struct {
	Nodes       []Node
	FinanceAsOf *time.Time
}

// Node amounts are USD, converted once after summing; the *Plan fields hold the plan-currency amounts.
type Node struct {
	Level    Level
	ID       string
	ParentID string
	PlanID   string
	Order    int
	// PlanAccess is a plan node's access facts: who may export it.
	PlanAccess authz.PlanFacts

	Name         string
	ExternalName string
	Description  string
	Owner        *Owner

	StartDate *date.Date
	EndDate   *date.Date
	Ongoing   bool
	Months    []string

	// Status is the owning feature's: plan status, a container's approval progress, an activity's display status.
	Status   string
	Approved int
	Total    int
	Timing   string
	Missing  int
	Swbs     string

	Budget           *money.Amount
	PlannedCost      *money.Amount
	LocalPlannedCost *money.Money
	MonthsUSD        []MonthAmount
	UnspreadUSD      money.Amount

	INQ, MQL *int64
	Revenue  *money.Amount

	CreatedAt, UpdatedAt time.Time
	Version              int

	Strategic       bool
	TeamIDs         []string
	BusinessUnitIDs []string
	ActivityTypeID  string

	Fields map[string]Value

	Finance         *FinanceFacts
	PlanYear        int
	PlanType        string
	PlanCurrency    string
	BudgetPlan      *money.Money
	PlannedCostPlan *money.Money
	PhasingMethod   string
	PhasedPlan      []money.Amount
	PhasedBudgetUSD []MonthAmount
	MonthsPlan      []PlanMonth
	UnspreadPlan    money.Amount
	Attrs           map[string]AttrValue
}

type AttrValue struct {
	OptionIDs []string
	Shares    map[string]money.Percent
	Yes       *bool
}

type PlanMonth struct {
	Month  string
	Amount money.Amount
}

// Value has at most one part set; none is an empty value ("—").
type Value struct {
	Text     string
	Number   *int64
	USD      *money.Amount
	Money    *money.Money
	Yes      *bool
	Choices  []Choice
	Inactive bool
}

type Choice struct {
	Label    string
	Share    *money.Percent
	Inactive bool
}

type Attribute struct {
	ID        string
	Label     string
	Level     Level
	Number    bool
	Active    bool
	Type      string
	Condition []string
	Options   []Option
}

const (
	TypeSingleChoice        = "singleChoice"
	TypeMultipleChoice      = "multipleChoice"
	TypeMultipleChoiceSplit = "multipleChoiceSplit"
	TypeYesNo               = "yesNo"
)

func (a Attribute) filterable() bool {
	switch a.Type {
	case TypeSingleChoice, TypeMultipleChoice, TypeMultipleChoiceSplit, TypeYesNo:
		return a.Active
	}
	return false
}

func (a Attribute) shownFor(units []string) bool {
	return len(a.Condition) == 0 || containsAny(a.Condition, units)
}

type Choices struct {
	Teams         []Option
	BusinessUnits []Option
	ActivityTypes []Option
	People        []Option
	SeesFinance   bool
	// FinancePlans nil means every plan; other plans' rows show "—" and add nothing to the Financials totals.
	FinancePlans []string
}

type MonthAmount struct {
	Month string
	USD   money.Amount
}

type Currency struct {
	Code string
	Rate money.Rate
}

var usd = Currency{Code: money.BaseCurrency, Rate: money.One}

type Location struct {
	Level      Level
	Name       string
	PlanID     string
	ActivityID string
	Year       int
}
