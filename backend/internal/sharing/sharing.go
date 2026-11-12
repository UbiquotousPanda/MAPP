// Package sharing holds the rule of view-only sharing with teams that dashboards and datasets follow.
package sharing

import (
	"slices"
	"strings"
)

// TeamIDs is the one order of shared team IDs, each once: by length, then text, so T-999 comes before T-1000.
func TeamIDs(list []string) []string {
	sorted := slices.Clone(list)
	if sorted == nil {
		sorted = []string{}
	}
	slices.SortFunc(sorted, func(a, b string) int {
		if len(a) != len(b) {
			return len(a) - len(b)
		}
		return strings.Compare(a, b)
	})
	return slices.Compact(sorted)
}

func Allowed(teams, allowed []string) bool {
	return !slices.ContainsFunc(teams, func(t string) bool { return !slices.Contains(allowed, t) })
}

func Changed(before, after []string) bool {
	return !slices.Equal(TeamIDs(before), TeamIDs(after))
}
