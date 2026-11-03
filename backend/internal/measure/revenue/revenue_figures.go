package revenue

import (
	"mapp/internal/platform/money"
)

// revenueFiguresOfActivities is each activity's own figures: Goal its own goal, Actual what was counted to today,
// Projected the same "actual or projected" total the cards show.
func revenueFiguresOfActivities(series []ActivitySeries) map[string]RevenueFigures {
	out := make(map[string]RevenueFigures, len(series))
	for _, a := range series {
		own := ownFigureOf(a, revenueMeasure())
		out[a.ID] = RevenueFigures{Goal: usdOf(own.goal), Actual: usdOf(own.actual), Projected: usdOf(own.total),
			ActualCostReason: ReasonAttributionNotConfigured, ROIReason: ReasonAttributionNotConfigured}
	}
	return out
}

// withPerformance converts f into the display currency, then derives Performance, a ratio, from Projected ÷ Goal.
func withPerformance(f RevenueFigures, display money.Display) RevenueFigures {
	f.Goal, f.Actual, f.Projected = display.Optional(f.Goal), display.Optional(f.Actual), display.Optional(f.Projected)
	if f.Goal == nil {
		return f
	}
	var total money.Amount
	if f.Projected != nil {
		total = f.Projected.Amount
	}
	f.Performance = performanceOf(total, f.Goal.Amount, true).Value
	return f
}

func addRevenueFigures(a, b RevenueFigures) RevenueFigures {
	a.Goal = addMoneyPtr(a.Goal, b.Goal)
	a.Actual = addMoneyPtr(a.Actual, b.Actual)
	a.Projected = addMoneyPtr(a.Projected, b.Projected)
	if a.ActualCostReason == "" {
		a.ActualCostReason, a.ROIReason = b.ActualCostReason, b.ROIReason
	}
	return a
}

// revenueTimes is the share of f a % split gives, each amount rounded half up to the cent.
func revenueTimes(f RevenueFigures, part money.Percent) RevenueFigures {
	scale := func(m *money.Money) *money.Money {
		if m == nil {
			return nil
		}
		shown := money.USD(money.FromCents(part.OfWhole(m.Amount.Cents())))
		return &shown
	}
	f.Goal, f.Actual, f.Projected = scale(f.Goal), scale(f.Actual), scale(f.Projected)
	return f
}

func addMoneyPtr(a, b *money.Money) *money.Money {
	if a == nil && b == nil {
		return nil
	}
	var total money.Amount
	if a != nil {
		total = total.Add(a.Amount)
	}
	if b != nil {
		total = total.Add(b.Amount)
	}
	sum := money.USD(total)
	return &sum
}

func centsOf(m *money.Money) int64 {
	if m == nil {
		return 0
	}
	return m.Amount.Cents()
}
