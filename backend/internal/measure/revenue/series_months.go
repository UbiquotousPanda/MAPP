package revenue

import (
	"time"

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
			INQ:        figureAt(facts.inq[i], countsOf(inq.Months), i, state),
			MQL:        figureAt(facts.mql[i], countsOf(mql.Months), i, state),
			RevenueUSD: figureAt(facts.revenue[i], amountsOf(v.projection.Revenue), i, state)}
		if state == StateInProgress {
			months[i].Days = time.Date(w.year, time.Month(i+2), 0, 0, 0, 0, 0, time.UTC).Day()
			months[i].DaysLeft = months[i].Days - w.today.Day() + 1
		}
	}
	return months
}

// figureAt reads month i of one measure; actual is nil without a fact that month, planned without a projection.
func figureAt[T int64 | money.Amount](actual *T, planned []T, i int, state string) Figure[T] {
	var f Figure[T]
	if state != StateFuture {
		f.Actual = cloned(actual)
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
