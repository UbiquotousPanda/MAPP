package summary

import (
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

// pick is one measure of ActivitySeries, added up by 049's own SumMonths so Summary cannot disagree with Revenue.
type pick struct {
	measure revenue.Measure
	goal    func(revenue.ActivitySeries) *int64
}

func revenuePick() pick {
	return pick{measure: revenue.RevenueMeasure(),
		goal: func(s revenue.ActivitySeries) *int64 { return cents(s.Goal.RevenueUSD) }}
}

func stagePick(stage Stage) pick {
	return pick{measure: revenue.StageMeasure(string(stage)), goal: func(s revenue.ActivitySeries) *int64 {
		if stage == StageMQL {
			return s.Goal.MQL
		}
		return s.Goal.INQ
	}}
}

// monthTotal is one month added up; actualOrProjected is 049's, which counts the month in progress once.
type monthTotal struct {
	key, state                                 string
	actual, projected, goal, actualOrProjected int64
}

type totals struct {
	months  []monthTotal
	goal    int64
	anyGoal bool
}

func sumSeries(series []revenue.ActivitySeries, p pick) totals {
	sums := revenue.SumMonths(series, p.measure)
	t := totals{goal: sums.ActivityGoals}
	for _, s := range series {
		t.anyGoal = t.anyGoal || p.goal(s) != nil
	}
	if len(series) == 0 {
		return t
	}
	for i, m := range series[0].Months[:min(len(series[0].Months), len(sums.Actual))] {
		t.months = append(t.months, monthTotal{key: m.Key, state: m.State, actual: sums.Actual[i],
			projected: sums.Projected[i], goal: sums.Goal[i], actualOrProjected: sums.ActualOrProjected(i)})
	}
	return t
}

func (t totals) actualOrProjected() int64 {
	var sum int64
	for _, m := range t.months {
		sum += m.actualOrProjected
	}
	return sum
}

func (t totals) actual() int64 {
	var sum int64
	for _, m := range t.months {
		sum += m.actual
	}
	return sum
}

func valueOf(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func cents(a *money.Amount) *int64 {
	if a == nil {
		return nil
	}
	c := a.Cents()
	return &c
}
