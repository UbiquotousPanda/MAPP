package revenue

import (
	"context"

	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/money"
)

// returns is what the ranked list's ROI rests on: the revenue 050's model credits to each activity in view and,
// for the plans whose financial data the person may see, the cost paid in the year.
type returns struct {
	credited attribution.Credited
	paid     map[string]money.Amount
}

// revenueSums carries beside the figures the credit of the activities whose cost is seen: all ROI may divide.
type revenueSums struct {
	figures     RevenueFigures
	roiCredited *money.Money
	models      []Stamp
}

func addRevenueSums(a, b revenueSums) revenueSums {
	return revenueSums{figures: addRevenueFigures(a.figures, b.figures), roiCredited: addMoneyPtr(a.roiCredited, b.roiCredited),
		models: unionStamps(a.models, b.models)}
}

func (s *Service) returnsOf(ctx context.Context, a actor.Actor, sc measure.Scope, series []ActivitySeries) (returns, error) {
	ids := make([]string, 0, len(series))
	var seen []string
	for _, as := range series {
		ids = append(ids, as.ID)
		if sc.SeesFinanceOf(as.PlanID) {
			seen = append(seen, as.ID)
		}
	}
	credited, err := s.deps.Credits.Credit(ctx, authz.ScopeOf(ctx), ids, sc.Year)
	if err != nil {
		return returns{}, err
	}
	q := attribution.CostQuery{Nodes: sc.Nodes, ActivityIDs: seen, Year: sc.Year}
	paid, err := attribution.PaidInYear(ctx, s.deps.Spending, a, q)
	return returns{credited: credited, paid: paid}, err
}

func (r returns) withOwn(activityID string, f RevenueFigures) revenueSums {
	if amount, found := r.credited.ByActivity[activityID]; found {
		credited := money.USD(amount)
		f.AttributedRevenue = &credited
	} else {
		f.AttributedRevenueReason = ReasonNoData
	}
	paid, sees := r.paid[activityID]
	if !sees {
		f.ActualCostReason = ReasonNoFinancialAccess
		return revenueSums{figures: f}
	}
	cost := money.USD(paid)
	f.ActualCost = &cost
	return revenueSums{figures: f, roiCredited: f.AttributedRevenue}
}

// withROI works the ROI out on the entry's own sums through 050's ROI, so a parent is never an average of children.
func withROI(f RevenueFigures, credited *money.Money) RevenueFigures {
	f.ROI, f.ROIReason = nil, ""
	switch {
	case f.ActualCost == nil:
		f.ROIReason = f.ActualCostReason
	case f.ActualCost.Amount.Sign() <= 0:
		f.ROIReason = ReasonNoActualCost
	case credited == nil:
		f.ROIReason = ReasonNoData
	default:
		whole := float64(*attribution.ROI(credited.Amount, &f.ActualCost.Amount))
		f.ROI = &whole
	}
	return f
}

// sumReason keeps a summed figure's reason only while no part has a figure.
func sumReason(sum *money.Money, a, b string) string {
	switch {
	case sum != nil:
		return ""
	case a != "":
		return a
	}
	return b
}
