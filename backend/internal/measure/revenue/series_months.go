package revenue

import (
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

func monthsOf(v activityView, w window) []Month {
	todayIndex := todayMonthIndex(w.today, w.year)
	inq, _ := v.projection.Find(StageINQ)
	mql, _ := v.projection.Find(StageMQL)
	facts := v.facts
	months := make([]Month, projection.Months)
	for i := range months {
		state := periodState(i, 1, todayIndex)
		months[i] = Month{Key: periodKey(w.year, i, 1), State: state,
			INQ:        figureAt(countsOf(facts.counts[StageINQ]), countsOf(inq.Months), i, state),
			MQL:        figureAt(countsOf(facts.counts[StageMQL]), countsOf(mql.Months), i, state),
			RevenueUSD: figureAt(amountsOf(facts.revenue), amountsOf(v.projection.Revenue), i, state)}
	}
	return months
}

// figureAt reads month i of one measure; actual and planned are nil when there is nothing counted or projected.
func figureAt[T int64 | money.Amount](actual, planned []T, i int, state string) Figure[T] {
	var f Figure[T]
	if state != StateFuture && i < len(actual) {
		f.Actual = cloned(&actual[i])
	}
	if i < len(planned) {
		f.Goal = cloned(&planned[i])
		if state != StatePast {
			f.Projected = cloned(&planned[i])
		}
	}
	return f
}

func countsOf(months []projection.MonthFigure) []int64 {
	if months == nil {
		return nil
	}
	out := make([]int64, len(months))
	for i, m := range months {
		out[i] = m.Value
	}
	return out
}

func amountsOf(months []projection.MoneyFigure) []money.Amount {
	if months == nil {
		return nil
	}
	out := make([]money.Amount, len(months))
	for i, m := range months {
		out[i] = m.Value.Amount
	}
	return out
}
