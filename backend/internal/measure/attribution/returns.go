package attribution

import (
	"context"
	"strconv"
	"strings"

	"mapp/internal/allwork"
	"mapp/internal/financials"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

// Stamp is what an attributed revenue and an ROI rest on, named beside them: the model and the cost basis.
type Stamp struct {
	Model string `json:"model"`
	Basis Basis  `json:"basis"`
}

type Spending interface {
	SpendByMonth(ctx context.Context, a actor.Actor, lineItemIDs []string) (map[string]map[string]financials.Facts, error)
}

func (s Stamp) Words() string {
	return s.Model + ", on " + string(s.Basis) + " cost"
}

func ActualStamp(m Model) Stamp {
	return Stamp{Model: m.Name(), Basis: BasisActual}
}

type CostQuery struct {
	Nodes       []allwork.Node
	ActivityIDs []string
	Year        int
}

// PaidInYear is each listed activity's actual cost, the payments booked in the year on its line items. Only
// the activities listed get an entry, so a plan whose financial data the person may not see has none.
func PaidInYear(ctx context.Context, spending Spending, a actor.Actor, q CostQuery) (map[string]money.Amount, error) {
	out := make(map[string]money.Amount, len(q.ActivityIDs))
	for _, id := range q.ActivityIDs {
		out[id] = money.Amount{}
	}
	lineItems, activityOf := lineItemsOf(q.Nodes, out)
	if len(lineItems) == 0 {
		return out, nil
	}
	spend, err := spending.SpendByMonth(ctx, a, lineItems)
	if err != nil {
		return nil, err
	}
	prefix := strconv.Itoa(q.Year) + "-"
	for lineItem, months := range spend {
		for month, facts := range months {
			if id, found := activityOf[lineItem]; found && strings.HasPrefix(month, prefix) {
				out[id] = out[id].Add(facts.Paid)
			}
		}
	}
	return out, nil
}

func lineItemsOf(nodes []allwork.Node, activities map[string]money.Amount) ([]string, map[string]string) {
	activityOf := map[string]string{}
	var ids []string
	for _, n := range nodes {
		if _, listed := activities[n.ParentID]; listed && n.Level == allwork.LevelLineItem {
			ids = append(ids, n.ID)
			activityOf[n.ID] = n.ParentID
		}
	}
	return ids, activityOf
}
