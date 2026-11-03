package revenue

import (
	"mapp/internal/platform/money"
)

// revenueFiguresOfActivities is each activity's own figures: Goal its own goal, Actual what was counted to today,
// Projected the same "actual or projected" total the cards show, and 050's credited revenue and actual cost.
func revenueFiguresOfActivities(series []ActivitySeries, r returns) map[string]RevenueFigures {
	out := make(map[string]RevenueFigures, len(series))
	for _, a := range series {
		own := ownFigureOf(a, revenueMeasure())
		out[a.ID] = r.withOwn(a.ID, RevenueFigures{Goal: usdOf(own.goal), Actual: usdOf(own.actual),
			Projected: usdOf(own.total)})
	}
	return out
}

// withPerformance works the ROI out in dollars, converts f to the display currency, then derives Performance.
func withPerformance(f RevenueFigures, display money.Display) RevenueFigures {
	f = withROI(f)
	f.Goal, f.Actual, f.Projected = display.Optional(f.Goal), display.Optional(f.Actual), display.Optional(f.Projected)
	f.AttributedRevenue, f.ActualCost = display.Optional(f.AttributedRevenue), display.Optional(f.ActualCost)
	performance := percentCard(nil)
	if f.Goal != nil {
		var total money.Amount
		if f.Projected != nil {
			total = f.Projected.Amount
		}
		performance = performanceOf(total, f.Goal.Amount, true)
	}
	f.Performance, f.Variance = performance.Value, performance.Variance
	return f
}

func addRevenueFigures(a, b RevenueFigures) RevenueFigures {
	a.Goal = addMoneyPtr(a.Goal, b.Goal)
	a.Actual = addMoneyPtr(a.Actual, b.Actual)
	a.Projected = addMoneyPtr(a.Projected, b.Projected)
	a.AttributedRevenue = addMoneyPtr(a.AttributedRevenue, b.AttributedRevenue)
	a.ActualCost = addMoneyPtr(a.ActualCost, b.ActualCost)
	a.AttributedRevenueReason = sumReason(a.AttributedRevenue, a.AttributedRevenueReason, b.AttributedRevenueReason)
	a.ActualCostReason = sumReason(a.ActualCost, a.ActualCostReason, b.ActualCostReason)
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
	f.AttributedRevenue, f.ActualCost = scale(f.AttributedRevenue), scale(f.ActualCost)
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
