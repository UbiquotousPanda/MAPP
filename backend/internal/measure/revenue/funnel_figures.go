package revenue

import (
	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

// previousActualsOfActivities is each activity's actual count at the previous stage, for each entry's conversion.
func previousActualsOfActivities(series []ActivitySeries, stage string) map[string]int64 {
	out := make(map[string]int64, len(series))
	previous, found := previousStage(stage)
	if !found {
		return out
	}
	m := stageMeasure(previous)
	for _, a := range series {
		if m.covers(a) {
			out[a.ID] = int64Of(ownFigureOf(a, m).actual)
		}
	}
	return out
}

func rollUpInt64(nodes []allwork.Node, below map[string][]string, own map[string]int64) map[string]int64 {
	totals := make(map[string]int64, len(nodes))
	var sum func(id string) int64
	sum = func(id string) int64 {
		if v, done := totals[id]; done {
			return v
		}
		children, hasChildren := below[id]
		if !hasChildren {
			v := own[id]
			totals[id] = v
			return v
		}
		var v int64
		for _, childID := range children {
			v += sum(childID)
		}
		totals[id] = v
		return v
	}
	for _, n := range nodes {
		sum(n.ID)
	}
	return totals
}

// funnelFiguresOfActivities is each activity's own figures for the selected stage: Goal its own goal, Actual what
// was counted to today, Projected the "actual or projected" total.
func funnelFiguresOfActivities(series []ActivitySeries, stage string) map[string]FunnelFigures {
	m := stageMeasure(stage)
	out := make(map[string]FunnelFigures, len(series))
	for _, a := range series {
		if !m.covers(a) {
			out[a.ID] = FunnelFigures{}
			continue
		}
		own := ownFigureOf(a, m)
		actual := int64Of(own.actual)
		out[a.ID] = FunnelFigures{Goal: own.goal, Actual: &actual, Projected: own.total}
	}
	return out
}

func rollUpFunnel(nodes []allwork.Node, below map[string][]string, ownActivity map[string]FunnelFigures) map[string]FunnelFigures {
	totals := make(map[string]FunnelFigures, len(nodes))
	var sum func(id string) FunnelFigures
	sum = func(id string) FunnelFigures {
		if f, done := totals[id]; done {
			return f
		}
		children, hasChildren := below[id]
		if !hasChildren {
			f := ownActivity[id]
			totals[id] = f
			return f
		}
		var f FunnelFigures
		for _, childID := range children {
			f = addFunnelFigures(f, sum(childID))
		}
		totals[id] = f
		return f
	}
	for _, n := range nodes {
		sum(n.ID)
	}
	return totals
}

// withFunnelDerived uses the cards' own formulas, so it holds for one activity and for a rolled-up total.
func withFunnelDerived(f FunnelFigures, previousActual int64) FunnelFigures {
	if f.Goal != nil {
		f.Performance = ratioCard(int64Of(f.Projected), *f.Goal, true).Value
	}
	f.Conversion = conversionCard(int64Of(f.Actual), &previousActual).Value
	return f
}

func addFunnelFigures(a, b FunnelFigures) FunnelFigures {
	a.Goal = addInt64Ptr(a.Goal, b.Goal)
	a.Actual = addInt64Ptr(a.Actual, b.Actual)
	a.Projected = addInt64Ptr(a.Projected, b.Projected)
	return a
}

// funnelTimes is the share of f a % split gives, each count rounded half up; nil keeps f whole.
func funnelTimes(f FunnelFigures, part *money.Percent) FunnelFigures {
	if part == nil {
		return f
	}
	scale := func(v *int64) *int64 {
		if v == nil {
			return nil
		}
		shown := part.OfWhole(*v)
		return &shown
	}
	f.Goal, f.Actual, f.Projected = scale(f.Goal), scale(f.Actual), scale(f.Projected)
	return f
}

func funnelTimesInt64(v int64, part *money.Percent) int64 {
	if part == nil {
		return v
	}
	return part.OfWhole(v)
}

func addInt64Ptr(a, b *int64) *int64 {
	if a == nil && b == nil {
		return nil
	}
	var sum int64
	if a != nil {
		sum += *a
	}
	if b != nil {
		sum += *b
	}
	return &sum
}

func int64Of(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}
