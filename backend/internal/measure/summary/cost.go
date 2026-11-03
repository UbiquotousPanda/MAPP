package summary

import (
	"context"
	"strconv"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/platform/actor"
)

// costs is each activity's actual cost, paid in the plans' year, for the plans whose financial data the
// person may see; the others have no entry, so their cost and ROI stay "—".
func (s *Service) costs(ctx context.Context, a actor.Actor, v view) (map[string]*int64, error) {
	out := map[string]*int64{}
	for _, series := range v.series {
		if v.seesFinance(series.PlanID) {
			out[series.ID] = new(int64)
		}
	}
	lineItems, activityOf := lineItemsUnder(v.scope.Nodes, out)
	if len(lineItems) == 0 {
		return out, nil
	}
	spend, err := s.deps.Spending.SpendByMonth(ctx, a, lineItems)
	if err != nil {
		return nil, err
	}
	prefix := strconv.Itoa(v.scope.Year) + "-"
	for lineItem, months := range spend {
		for month, facts := range months {
			if cost, found := out[activityOf[lineItem]]; found && strings.HasPrefix(month, prefix) {
				*cost += facts.Paid.Cents()
			}
		}
	}
	return out, nil
}

func lineItemsUnder(nodes []allwork.Node, activities map[string]*int64) ([]string, map[string]string) {
	var ids []string
	activityOf := map[string]string{}
	for _, n := range nodes {
		if _, found := activities[n.ParentID]; found && n.Level == allwork.LevelLineItem {
			ids = append(ids, n.ID)
			activityOf[n.ID] = n.ParentID
		}
	}
	return ids, activityOf
}
