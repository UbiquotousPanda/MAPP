package summary

import (
	"cmp"
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/platform/money"
)

const leagueSize = 5

// leagueRow is one segment value; Value is money in cents or a whole per cent, and nil shows "—".
type leagueRow struct {
	Key   string
	Name  string
	Value *int64
}

// shares splits cents between a record's distinct values: by a % split's shares with Revenue's ranked view's rounding,
// otherwise equally so the shares add up exactly.
func shares(cents int64, value allwork.AttrValue) map[string]int64 {
	keys := slices.Clone(value.OptionIDs)
	slices.Sort(keys)
	keys = slices.Compact(keys)
	if len(keys) == 0 {
		return map[string]int64{NotFilledIn: cents}
	}
	out := make(map[string]int64, len(keys))
	if isWeighted(value, keys) {
		for _, key := range keys {
			out[key] = value.Shares[key].OfWhole(cents)
		}
		return out
	}
	for i, part := range money.FromCents(cents).SplitEvenly(len(keys)) {
		out[keys[i]] = part.Cents()
	}
	return out
}

func isWeighted(value allwork.AttrValue, keys []string) bool {
	return len(value.Shares) > 0 && !slices.ContainsFunc(keys, func(key string) bool {
		_, found := value.Shares[key]
		return !found
	})
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
