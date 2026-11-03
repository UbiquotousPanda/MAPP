package revenue

import (
	"slices"

	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

// measureOf picks one measure out of ActivitySeries, revenue in cents or a stage's count, so both reports add up
// the same way.
type measureOf struct {
	key    string
	month  func(Month) Figure[int64]
	goal   func(ActivitySeries) *int64
	covers func(ActivitySeries) bool
}

func revenueMeasure() measureOf {
	return measureOf{
		key: stageRevenue,
		month: func(m Month) Figure[int64] {
			f := m.RevenueUSD
			return Figure[int64]{Actual: cents(f.Actual), Projected: cents(f.Projected), Goal: cents(f.Goal)}
		},
		goal:   func(a ActivitySeries) *int64 { return cents(a.Goal.RevenueUSD) },
		covers: func(a ActivitySeries) bool { return a.HasProjection },
	}
}

func stageMeasure(stage string) measureOf {
	return measureOf{
		key: stage,
		month: func(m Month) Figure[int64] {
			if stage == StageMQL {
				return m.MQL
			}
			return m.INQ
		},
		goal:   func(a ActivitySeries) *int64 { return stageGoalOf(a.Goal, stage) },
		covers: func(a ActivitySeries) bool { return slices.Contains(a.Stages, stage) },
	}
}

// monthlySums keeps pastActual by month for a quarter in progress; counted and projects tell a real zero from none.
type monthlySums struct {
	actual, pastActual, projected, goal [projection.Months]int64
	unprojected                         [projection.Months]int64
	counted, projects                   [projection.Months]bool
	activityGoals                       int64
}

func sumMonths(series []ActivitySeries, m measureOf) monthlySums {
	var sums monthlySums
	for _, a := range series {
		for i, month := range a.Months {
			f := m.month(month)
			sums.actual[i] += int64Of(f.Actual)
			if month.State == StatePast {
				sums.pastActual[i] += int64Of(f.Actual)
			}
			sums.projected[i] += int64Of(f.Projected)
			if month.State == StateInProgress && f.Projected == nil {
				sums.unprojected[i] += int64Of(f.Actual)
			}
			sums.counted[i] = sums.counted[i] || f.Actual != nil
			sums.projects[i] = sums.projects[i] || f.Projected != nil
			sums.goal[i] += int64Of(f.Goal)
		}
		sums.activityGoals += int64Of(m.goal(a))
	}
	return sums
}

// total is actual or projected over the year, the month in progress counted once, through projected.
func (s monthlySums) total() int64 {
	var total int64
	for i := range projection.Months {
		total += s.pastActual[i] + s.projected[i] + s.unprojected[i]
	}
	return total
}

func (s monthlySums) actualTotal() int64 {
	var total int64
	for _, v := range s.actual {
		total += v
	}
	return total
}

// ownFigure is one activity's goal, its actual to today (nil before any counted fact) and its actual or projected.
type ownFigure struct {
	goal, actual, total *int64
}

func ownFigureOf(a ActivitySeries, m measureOf) ownFigure {
	sums := sumMonths([]ActivitySeries{a}, m)
	out := ownFigure{goal: m.goal(a)}
	if slices.ContainsFunc(a.Months, func(month Month) bool { return m.month(month).Actual != nil }) {
		actual := sums.actualTotal()
		out.actual = &actual
	}
	if out.actual != nil || m.covers(a) {
		total := sums.total()
		out.total = &total
	}
	return out
}

// anyTotal says whether some activity has an actual or projected figure of the measure, so a total of none is "—".
func anyTotal(series []ActivitySeries, m measureOf) bool {
	return slices.ContainsFunc(series, func(a ActivitySeries) bool { return ownFigureOf(a, m).total != nil })
}

func cents(a *money.Amount) *int64 {
	if a == nil {
		return nil
	}
	c := a.Cents()
	return &c
}

func usdOf(c *int64) *money.Money {
	if c == nil {
		return nil
	}
	m := money.USD(money.FromCents(*c))
	return &m
}

func stageGoalOf(g Goal, stage string) *int64 {
	if stage == StageMQL {
		return cloned(g.MQL)
	}
	return cloned(g.INQ)
}
