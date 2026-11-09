package attribution

import (
	"cmp"
	"slices"
	"strings"
)

const (
	kindINQ        = "inq"
	kindMQL        = "mql"
	kindSessions   = "sessions"
	kindVisits     = "visits"
	kindEngagement = "engagementTouches"
)

// steps collapses a journey's touches to one per activity and day, by date then activity ID.
func steps(touches []JourneyTouch) []Touch {
	var out []Touch
	for _, t := range touches {
		if !slices.Contains(out, t.Touch) {
			out = append(out, t.Touch)
		}
	}
	slices.SortFunc(out, compareTouches)
	return out
}

func compareTouches(x, y Touch) int {
	return cmp.Or(x.Date.Compare(y.Date), strings.Compare(x.ActivityID, y.ActivityID))
}

// kindsOf lists what was recorded at one step, once each: the funnel stages first, then the web metrics.
func kindsOf(touches []JourneyTouch, step Touch) []string {
	var kinds []string
	for _, t := range touches {
		if t.Touch == step && t.Kind != "" && !slices.Contains(kinds, t.Kind) {
			kinds = append(kinds, t.Kind)
		}
	}
	slices.SortFunc(kinds, func(a, b string) int { return cmp.Compare(kindRank(a), kindRank(b)) })
	return kinds
}

func kindRank(kind string) int {
	known := []string{kindINQ, kindMQL, kindSessions, kindVisits, kindEngagement}
	if rank := slices.Index(known, kind); rank >= 0 {
		return rank
	}
	return len(known)
}
