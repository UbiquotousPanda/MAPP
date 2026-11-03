package summary

import (
	"slices"

	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

// pick chooses one measure of ActivitySeries and the activities it counts, as 049's sums do.
type pick struct {
	month  func(revenue.Month) revenue.Figure[int64]
	goal   func(revenue.ActivitySeries) *int64
	covers func(revenue.ActivitySeries) bool
}

func revenuePick() pick {
	return pick{
		month: func(m revenue.Month) revenue.Figure[int64] {
			f := m.RevenueUSD
			return revenue.Figure[int64]{Actual: cents(f.Actual), Projected: cents(f.Projected), Goal: cents(f.Goal)}
		},
		goal:   func(s revenue.ActivitySeries) *int64 { return cents(s.Goal.RevenueUSD) },
		covers: func(s revenue.ActivitySeries) bool { return s.HasProjection },
	}
}

func stagePick(stage Stage) pick {
	return pick{
		month: func(m revenue.Month) revenue.Figure[int64] {
			if stage == StageMQL {
				return m.MQL
			}
			return m.INQ
		},
		goal: func(s revenue.ActivitySeries) *int64 {
			if stage == StageMQL {
				return s.Goal.MQL
			}
			return s.Goal.INQ
		},
		covers: func(s revenue.ActivitySeries) bool { return slices.Contains(s.Stages, string(stage)) },
	}
}

type monthTotal struct {
	key, state              string
	actual, projected, goal int64
}

type totals struct {
	months    []monthTotal
	goal      int64
	anyGoal   bool
	anyActual bool
}

func sumSeries(series []revenue.ActivitySeries, p pick) totals {
	var t totals
	for _, s := range series {
		if !p.covers(s) {
			t.keepMonths(s.Months)
			continue
		}
		t.addGoal(p.goal(s))
		for i, m := range s.Months {
			t.add(i, m, p.month(m))
		}
	}
	return t
}

// keepMonths adds the months a covered activity has not given yet, so the trend has the year's periods.
func (t *totals) keepMonths(months []revenue.Month) {
	for _, m := range months[min(len(t.months), len(months)):] {
		t.months = append(t.months, monthTotal{key: m.Key, state: m.State})
	}
}

func (t *totals) addGoal(goal *int64) {
	if goal != nil {
		t.goal += *goal
		t.anyGoal = true
	}
}

func (t *totals) add(i int, m revenue.Month, f revenue.Figure[int64]) {
	for len(t.months) <= i {
		t.months = append(t.months, monthTotal{})
	}
	mt := &t.months[i]
	mt.key, mt.state = m.Key, m.State
	if f.Actual != nil {
		mt.actual += *f.Actual
		t.anyActual = true
	}
	mt.projected += valueOf(f.Projected)
	mt.goal += valueOf(f.Goal)
}

// actualOrProjected counts the month in progress once, through projected, as Revenue's cards do.
func (m monthTotal) actualOrProjected() int64 {
	if m.state == revenue.StatePast {
		return m.actual + m.projected
	}
	return m.projected
}

func (t totals) actualOrProjected() int64 {
	var sum int64
	for _, m := range t.months {
		sum += m.actualOrProjected()
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
