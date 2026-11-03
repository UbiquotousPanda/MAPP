package summary

import (
	"cmp"
	"slices"

	"mapp/internal/platform/money"
)

const leagueSize = 5

// leagueRow is one segment value; Value is money in cents or a whole per cent, and nil shows "—".
type leagueRow struct {
	Key   string
	Name  string
	Value *int64
}

// shares splits cents equally between a record's distinct values, so the shares add up exactly.
func shares(cents int64, values []string) map[string]int64 {
	keys := slices.Clone(values)
	slices.Sort(keys)
	keys = slices.Compact(keys)
	if len(keys) == 0 {
		return map[string]int64{NotFilledIn: cents}
	}
	out := make(map[string]int64, len(keys))
	for i, part := range money.FromCents(cents).SplitEvenly(len(keys)) {
		out[keys[i]] = part.Cents()
	}
	return out
}

func topFive(rows []leagueRow) []leagueRow {
	sorted := ranked(rows)
	return sorted[:min(leagueSize, len(sorted))]
}

func ranked(rows []leagueRow) []leagueRow {
	sorted := slices.Clone(rows)
	slices.SortStableFunc(sorted, compareRows)
	return sorted
}

func compareRows(a, b leagueRow) int {
	switch {
	case a.Value == nil && b.Value == nil:
		return cmp.Compare(a.Name, b.Name)
	case a.Value == nil:
		return 1
	case b.Value == nil:
		return -1
	}
	if byValue := cmp.Compare(*b.Value, *a.Value); byValue != 0 {
		return byValue
	}
	return cmp.Compare(a.Name, b.Name)
}
