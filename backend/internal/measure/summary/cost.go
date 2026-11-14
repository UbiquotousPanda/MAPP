package summary

import (
	"context"

	"mapp/internal/measure/attribution"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

// costs is each activity's actual cost, paid in the plans' year, for the plans whose financial data the
// person may see; the others have no entry, so their cost and ROI stay "—".
func (s *Service) costs(ctx context.Context, a actor.Actor, v view) (map[string]*int64, error) {
	var seen []string
	for _, series := range v.series {
		if v.seesFinance(series.PlanID) {
			seen = append(seen, series.ID)
		}
	}
	q := attribution.CostQuery{Nodes: v.scope.Nodes, ActivityIDs: seen, Year: v.scope.Year}
	paid, err := attribution.PaidInYear(ctx, s.deps.Spending, a, q)
	if err != nil {
		return nil, err
	}
	out := make(map[string]*int64, len(paid))
	for id, amount := range paid {
		cents := amount.Cents()
		out[id] = &cents
	}
	return out, nil
}

func (s *Service) credits(ctx context.Context, v view) (attribution.Credited, error) {
	ids := make([]string, 0, len(v.series))
	for _, series := range v.series {
		ids = append(ids, series.ID)
	}
	return s.deps.Credits.Credit(ctx, authz.ScopeOf(ctx), ids, v.scope.Year)
}
