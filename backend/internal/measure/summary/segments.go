package summary

import (
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/measure/revenue"
)

type Segment struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Level string `json:"level"`
}

// segmentsOf are the active choice attributes at Plan, Campaign and Activity level, the Activity ones first so the
// default is the first of them (048-C4).
func segmentsOf(attributes []allwork.Attribute) []Segment {
	var activity, others []Segment
	for _, at := range attributes {
		if !isSegment(at) {
			continue
		}
		s := Segment{ID: at.ID, Label: at.Label, Level: string(at.Level)}
		if at.Level == allwork.LevelActivity {
			activity = append(activity, s)
		} else {
			others = append(others, s)
		}
	}
	return slices.Concat(activity, others)
}

func isSegment(at allwork.Attribute) bool {
	levels := []allwork.Level{allwork.LevelPlan, allwork.LevelCampaign, allwork.LevelActivity}
	types := []string{allwork.TypeSingleChoice, allwork.TypeMultipleChoice, allwork.TypeMultipleChoiceSplit}
	return at.Active && slices.Contains(levels, at.Level) && slices.Contains(types, at.Type)
}

// tally is one segment value's share of the activities' figures, in cents and counts as each table needs them.
type tally struct {
	total, goal, actual, cost int64
	costSeen                  bool
	months                    []int64
}

func (t tally) add(o tally) tally {
	t.total, t.goal, t.actual, t.cost = t.total+o.total, t.goal+o.goal, t.actual+o.actual, t.cost+o.cost
	t.costSeen = t.costSeen || o.costSeen
	for len(t.months) < len(o.months) {
		t.months = append(t.months, 0)
	}
	for i, v := range o.months {
		t.months[i] += v
	}
	return t
}

// split shares one activity's tally equally between its values; Not filled in takes it when it has none.
func (t tally) split(values []string) map[string]tally {
	totals, goals, actuals, costs := shares(t.total, values), shares(t.goal, values), shares(t.actual, values),
		shares(t.cost, values)
	out := make(map[string]tally, len(totals))
	for key := range totals {
		out[key] = tally{total: totals[key], goal: goals[key], actual: actuals[key], cost: costs[key],
			costSeen: t.costSeen, months: make([]int64, len(t.months))}
	}
	for i, v := range t.months {
		for key, part := range shares(v, values) {
			out[key].months[i] = part
		}
	}
	return out
}

func tallyOf(s revenue.ActivitySeries, cost *int64) tally {
	sums := sumSeries([]revenue.ActivitySeries{s}, revenuePick())
	out := tally{total: sums.actualOrProjected(), goal: sums.goal, actual: sums.actual()}
	for _, m := range sums.months {
		out.months = append(out.months, m.actualOrProjected())
	}
	if cost != nil {
		out.cost, out.costSeen = *cost, true
	}
	return out
}

func valuesOf(s revenue.ActivitySeries, segment string) []string {
	return s.Attributes[segment].OptionIDs
}

func optionNames(attributes []allwork.Attribute, segment string) map[string]string {
	names := map[string]string{NotFilledIn: notFilledInLabel}
	for _, at := range attributes {
		if at.ID != segment {
			continue
		}
		for _, o := range at.Options {
			names[o.ID] = o.Label
		}
	}
	return names
}
