package revenue

import "mapp/internal/projection"

type Measure struct{ of measureOf }

func RevenueMeasure() Measure { return Measure{of: revenueMeasure()} }

func StageMeasure(stage string) Measure { return Measure{of: stageMeasure(stage)} }

// Sums are added up as the cards add them: PastActual holds finished months only, so Total counts the month in progress once.
type Sums struct {
	Actual, PastActual, Projected, Goal [projection.Months]int64
	ActivityGoals                       int64
}

func SumMonths(series []ActivitySeries, m Measure) Sums {
	s := sumMonths(series, m.of)
	return Sums{Actual: s.actual, PastActual: s.pastActual, Projected: s.projected, Goal: s.goal,
		ActivityGoals: s.activityGoals}
}

func (s Sums) Total() int64 { return s.internal().total() }

func (s Sums) ActualTotal() int64 { return s.internal().actualTotal() }

func (s Sums) internal() monthlySums {
	return monthlySums{actual: s.Actual, pastActual: s.PastActual, projected: s.Projected, goal: s.Goal,
		activityGoals: s.ActivityGoals}
}

// OwnFigure is a ranked row's figures: Actual is nil before any counted fact, Total when nothing projects or was counted.
type OwnFigure struct {
	Goal, Actual, Total *int64
}

func OwnFigureOf(a ActivitySeries, m Measure) OwnFigure {
	own := ownFigureOf(a, m.of)
	return OwnFigure{Goal: own.goal, Actual: own.actual, Total: own.total}
}
