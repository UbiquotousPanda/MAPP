package revenue

import (
	"mapp/internal/allwork"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

// revenueFiguresOfActivities is each activity's own figures: Goal is the full plan-year projection, Actual
// every counted fact, Projected the same "actual or projected" total the cards show (FR-004, FR-012).
func revenueFiguresOfActivities(views []activityView, w window) map[string]RevenueFigures {
	out := make(map[string]RevenueFigures, len(views))
	for _, v := range views {
		f := RevenueFigures{ActualCostReason: ReasonAttributionNotConfigured, ROIReason: ReasonAttributionNotConfigured}
		if v.projection.Present {
			goal := sumMoney(v.projection.Revenue)
			f.Goal = &goal
		}
		if len(v.facts.revenue) > 0 {
			actual := sumMoney(v.facts.revenue)
			f.Actual = &actual
		}
		split := projectionSplit(v, w)
		if f.Actual != nil || v.projection.Present {
			total := money.USD(split.Actual.Amount.Add(split.Projected.Amount))
			f.Projected = &total
		}
		out[v.node.ID] = f
	}
	return out
}

func projectionSplit(v activityView, w window) projection.SplitMoney {
	return projection.SplitAmounts(v.facts.revenue, v.projection.Revenue, w.today, w.year)
}

// withPerformance converts f into the display currency (FR-024, every figure the ranked list shows, not
// only the report's own cards) and derives Performance from Projected ÷ Goal (049-C15, 049-C16) — a ratio,
// so it is the same whichever currency the conversion already happened in.
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

// rollUpRevenue sums every node's figures from its activity descendants, so a plan or campaign row shows
// its activities' totals (FR-063, SC-002); a leaf activity keeps its own.
func rollUpRevenue(nodes []allwork.Node, below map[string][]string, ownActivity map[string]RevenueFigures) map[string]RevenueFigures {
	totals := make(map[string]RevenueFigures, len(nodes))
	var sum func(id string) RevenueFigures
	sum = func(id string) RevenueFigures {
		if f, done := totals[id]; done {
			return f
		}
		children, hasChildren := below[id]
		if !hasChildren {
			f := ownActivity[id]
			totals[id] = f
			return f
		}
		var f RevenueFigures
		for _, childID := range children {
			f = addRevenueFigures(f, sum(childID))
		}
		totals[id] = f
		return f
	}
	for _, n := range nodes {
		sum(n.ID)
	}
	return totals
}

func sumMoney(months []projection.MoneyFigure) money.Money {
	var total money.Amount
	for _, m := range months {
		total = total.Add(m.Value.Amount)
	}
	return money.USD(total)
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

// revenueTimes is the share of f a % split gives, each amount rounded half up to the cent; nil keeps f whole.
func revenueTimes(f RevenueFigures, part *money.Percent) RevenueFigures {
	if part == nil {
		return f
	}
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
