package revenue

import (
	"mapp/internal/platform/money"
)

func previousActualsOfActivities(series []ActivitySeries, stage string) map[string]int64 {
	out := make(map[string]int64, len(series))
	previous, found := previousStage(stage)
	if !found {
		return out
	}
	m := stageMeasure(previous)
	for _, a := range series {
		out[a.ID] = int64Of(ownFigureOf(a, m).actual)
	}
	return out
}

// funnelFiguresOfActivities is each activity's own figures for the selected stage: Goal its own goal, Actual what
// was counted to today, Projected the "actual or projected" total.
func funnelFiguresOfActivities(series []ActivitySeries, stage string) map[string]FunnelFigures {
	m := stageMeasure(stage)
	out := make(map[string]FunnelFigures, len(series))
	for _, a := range series {
		own := ownFigureOf(a, m)
		if !m.covers(a) {
			out[a.ID] = FunnelFigures{Goal: own.goal, Actual: own.actual, Projected: own.total}
			continue
		}
		actual := int64Of(own.actual)
		out[a.ID] = FunnelFigures{Goal: own.goal, Actual: &actual, Projected: own.total}
	}
	return out
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

// funnelTimes is the share of f a % split gives, each count rounded half up.
func funnelTimes(f FunnelFigures, part money.Percent) FunnelFigures {
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
