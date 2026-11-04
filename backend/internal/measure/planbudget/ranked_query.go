package planbudget

import (
	"net/url"

	"mapp/internal/measure/ranking"
)

const (
	SortBudget     = "budget"
	SortPlanned    = "planned"
	SortCommitted  = "committed"
	SortActual     = "actual"
	SortLeftToPlan = "leftToPlan"
	SortUnspent    = "unspent"
)

type RankedQuery = ranking.Query

// ParseRanked reads the ranked list's parameters; every problem is answered at once.
func ParseRanked(values url.Values) (RankedQuery, error) {
	return ranking.Parse(values, []string{SortBudget, SortPlanned, SortCommitted, SortActual, SortLeftToPlan, SortUnspent},
		SortPlanned)
}
