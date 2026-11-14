package attribution

import (
	"cmp"
	"slices"
	"strings"
	"time"

	"mapp/internal/platform/money"
)

type monthKey struct {
	activity string
	currency string
	year     int
	month    time.Month
}

// inDollars converts the facts of one activity, month and currency together as parts of their total (D-024), so
// they add up to the Actual 049 shows; a currency without a rate leaves its facts out (nil) and counts them.
func inDollars(facts []RevenueFact, rates money.Rates) ([]*money.Amount, int) {
	dollars := make([]*money.Amount, len(facts))
	withoutRate := 0
	for _, group := range monthGroups(facts) {
		rate, err := rates.Of(facts[group[0]].Revenue.Currency)
		if err != nil {
			withoutRate += len(group)
			continue
		}
		parts := make([]money.Amount, len(group))
		for i, at := range group {
			parts[i] = facts[at].Revenue.Amount
		}
		for i, usd := range money.ConvertParts(parts, rate, money.One) {
			dollars[group[i]] = &usd
		}
	}
	return dollars, withoutRate
}

// monthGroups indexes the facts by activity, month and currency, each group in date then ID order.
func monthGroups(facts []RevenueFact) [][]int {
	var order []monthKey
	groups := map[monthKey][]int{}
	for i, f := range facts {
		k := monthKey{activity: f.ActivityID, currency: f.Revenue.Currency, year: f.Date.Year(), month: f.Date.Month()}
		if _, seen := groups[k]; !seen {
			order = append(order, k)
		}
		groups[k] = append(groups[k], i)
	}
	out := make([][]int, 0, len(order))
	for _, k := range order {
		group := groups[k]
		slices.SortStableFunc(group, func(a, b int) int {
			return cmp.Or(facts[a].Date.Compare(facts[b].Date), strings.Compare(facts[a].ID, facts[b].ID))
		})
		out = append(out, group)
	}
	return out
}
