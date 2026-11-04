package revenue

import (
	"slices"
	"strings"
	"time"
)

// activityStamps is the model behind an activity's projected figures, none when it does not project.
func activityStamps(a ActivitySeries) []Stamp {
	if !a.HasProjection || a.ModelName == "" {
		return nil
	}
	return []Stamp{{ModelName: a.ModelName, ModelChangedAt: a.ModelChangedAt.Format(time.RFC3339)}}
}

// stampsOf names every model behind a projected figure in view, by name, so a view mixing plans names them all.
func stampsOf(series []ActivitySeries) []Stamp {
	out := []Stamp{}
	for _, a := range series {
		out = unionStamps(out, activityStamps(a))
	}
	slices.SortFunc(out, func(x, y Stamp) int { return strings.Compare(x.ModelName, y.ModelName) })
	return out
}

func unionStamps(a, b []Stamp) []Stamp {
	out := slices.Clip(a)
	for _, s := range b {
		if !slices.Contains(out, s) {
			out = append(out, s)
		}
	}
	return out
}

// singleStamp is a row's model only when one model is behind it; a row mixing models names none.
func singleStamp(stamps []Stamp) *Stamp {
	if len(stamps) != 1 {
		return nil
	}
	return &stamps[0]
}

func stampsOfActivities(series []ActivitySeries) map[string][]Stamp {
	out := make(map[string][]Stamp, len(series))
	for _, a := range series {
		out[a.ID] = activityStamps(a)
	}
	return out
}
