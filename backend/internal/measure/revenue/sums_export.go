package revenue

import "mapp/internal/projection"

// Measure is one figure to add up across ActivitySeries: revenue in USD cents, or a funnel stage's count.
type Measure struct{ of measureOf }

func RevenueMeasure() Measure { return Measure{of: revenueMeasure()} }

func StageMeasure(stage string) Measure { return Measure{of: stageMeasure(stage)} }

// Sums are a measure added month by month, the way the Revenue and Funnel cards add it. PastActual holds only
// finished months, so a period's "actual or projected" is PastActual plus Projected.
type Sums struct {
	Actual, PastActual, Projected, Goal [projection.Months]int64
	ActivityGoals                       int64
}

func SumMonths(series []ActivitySeries, m Measure) Sums {
	s := sumMonths(series, m.of)
	return Sums{Actual: s.actual, PastActual: s.pastActual, Projected: s.projected, Goal: s.goal,
		ActivityGoals: s.activityGoals}
}

// Total is actual or projected over the year, the month in progress counted once, through Projected.
func (s Sums) Total() int64 { return s.internal().total() }

func (s Sums) ActualTotal() int64 { return s.internal().actualTotal() }

func (s Sums) internal() monthlySums {
	return monthlySums{actual: s.Actual, pastActual: s.PastActual, projected: s.Projected, goal: s.Goal,
		activityGoals: s.ActivityGoals}
}

// OwnFigure is one activity's figures as a ranked row shows them: Actual is nil before any counted fact, and
// Total is nil when the activity neither projects the measure nor has a counted fact.
type OwnFigure struct {
	Goal, Actual, Total *int64
}

func OwnFigureOf(a ActivitySeries, m Measure) OwnFigure {
	own := ownFigureOf(a, m.of)
	return OwnFigure{Goal: own.goal, Actual: own.actual, Total: own.total}
}
