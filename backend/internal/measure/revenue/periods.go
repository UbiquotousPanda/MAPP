package revenue

import (
	"fmt"

	"mapp/internal/measure"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

type window struct {
	today date.Date
	year  int
}

// periodBounds is one period's position in the year: its first month, its size, and where today falls.
type periodBounds struct {
	first, size, todayIndex, year int
}

func (b periodBounds) inProgress() bool {
	return b.todayIndex >= b.first && b.todayIndex < b.first+b.size
}

func periodsOf(w window, period string) []periodBounds {
	size := periodSize(period)
	todayIndex := todayMonthIndex(w.today, w.year)
	out := make([]periodBounds, 0, projection.Months/size)
	for first := 0; first < projection.Months; first += size {
		out = append(out, periodBounds{first: first, size: size, todayIndex: todayIndex, year: w.year})
	}
	return out
}

func revenuePeriods(sums monthlySums, period string, w window, display money.Display) []RevenuePeriod {
	bounds := periodsOf(w, period)
	out := make([]RevenuePeriod, 0, len(bounds))
	for _, b := range bounds {
		v := sums.periodOf(b)
		out = append(out, RevenuePeriod{Key: v.key, State: v.state, InProgress: v.inProgress,
			Goal: shownOf(display, v.goal), Actual: shownOf(display, v.actual), Projected: shownOf(display, v.projected)})
	}
	return out
}

// revenueTotals is each period column over the year, converted once from US dollars as the cards are.
func revenueTotals(sums monthlySums, display money.Display) RevenueTotals {
	v := sums.yearOf()
	return RevenueTotals{Goal: shownOf(display, v.goal), Actual: shownOf(display, v.actual),
		Projected: shownOf(display, v.projected), GoalAfterYear: GoalAfterYear(display, sums.activityGoals, v.goal)}
}

func funnelTotals(sums monthlySums) FunnelTotals {
	v := sums.yearOf()
	out := FunnelTotals{Goal: v.goal, Actual: v.actual, Projected: v.projected}
	if after := sums.activityGoals - int64Of(v.goal); after > 0 {
		out.GoalAfterYear = &after
	}
	return out
}

// LabelGoalAfterYear names the export line under the Total that reconciles it with the goal card.
const LabelGoalAfterYear = "Goal landing after December"

// GoalAfterYear is the goal card less the Goal total, both as shown, so the Total and this add up to the card exactly.
func GoalAfterYear(display money.Display, whole int64, inYear *int64) *money.Money {
	after := shownIn(display, whole).Sub(shownIn(display, int64Of(inYear)))
	if after.Sign() <= 0 {
		return nil
	}
	return &money.Money{Amount: after, Currency: display.Currency()}
}

func shownOf(display money.Display, c *int64) *money.Money {
	if c == nil {
		return nil
	}
	m := display.Money(money.USD(money.FromCents(*c)))
	return &m
}

func funnelPeriods(sums monthlySums, period string, w window) []FunnelPeriod {
	bounds := periodsOf(w, period)
	out := make([]FunnelPeriod, 0, len(bounds))
	for _, b := range bounds {
		v := sums.periodOf(b)
		out = append(out, FunnelPeriod{Key: v.key, State: v.state, InProgress: v.inProgress,
			Goal: v.goal, Actual: v.actual, Projected: v.projected})
	}
	return out
}

// periodValues is one period's sums; actual is nil where nothing is counted, projected where nothing is projected,
// goal when it is zero.
type periodValues struct {
	key, state              string
	inProgress              bool
	actual, projected, goal *int64
}

func (s monthlySums) periodOf(b periodBounds) periodValues {
	var a, p, g int64
	hasActual, hasProjected := false, false
	for i := b.first; i < b.first+b.size; i++ {
		a, p, g = a+s.actual[i], p+s.projected[i], g+s.goal[i]
		hasActual, hasProjected = hasActual || s.counted[i], hasProjected || s.projects[i]
	}
	out := periodValues{key: periodKey(b.year, b.first, b.size), state: periodState(b.first, b.size, b.todayIndex),
		inProgress: b.inProgress()}
	if g != 0 {
		out.goal = &g
	}
	if hasActual {
		out.actual = &a
	}
	if hasProjected {
		out.projected = &p
	}
	return out
}

// yearOf is the whole year as one period, so a column's total is "—" exactly when every period of it is.
func (s monthlySums) yearOf() periodValues {
	return s.periodOf(periodBounds{size: projection.Months, todayIndex: -1})
}

func periodSize(period string) int {
	if period == measure.PeriodQuarter {
		return 3
	}
	return 1
}

func periodKey(year, first, size int) string {
	if size == 3 {
		return fmt.Sprintf("%04d-Q%d", year, first/3+1)
	}
	return fmt.Sprintf("%04d-%02d", year, first+1)
}

func periodState(first, size, todayIndex int) string {
	switch {
	case todayIndex < 0:
		return StateFuture
	case todayIndex >= first+size:
		return StatePast
	case todayIndex >= first:
		return StateInProgress
	}
	return StateFuture
}

// todayMonthIndex is today's place in the plan year, or -1 before it and projection.Months after it.
func todayMonthIndex(today date.Date, year int) int {
	if today.Year() != year {
		if today.Year() < year {
			return -1
		}
		return projection.Months
	}
	return int(today.Month()) - 1
}
