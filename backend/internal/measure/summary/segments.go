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
// default is the first of them.
func segmentsOf(attributes []allwork.Attribute) []Segment {
	activity, others := []Segment{}, []Segment{}
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
	return append(activity, others...)
}

func isSegment(at allwork.Attribute) bool {
	levels := []allwork.Level{allwork.LevelPlan, allwork.LevelCampaign, allwork.LevelActivity}
	types := []string{allwork.TypeSingleChoice, allwork.TypeMultipleChoice, allwork.TypeMultipleChoiceSplit}
	return at.Active && slices.Contains(levels, at.Level) && slices.Contains(types, at.Type)
}

// tally is one segment value's share of the activities' figures, in cents and counts as each table needs them.
type tally struct {
	total, goal, cost, credited int64
	costSeen, creditedSeen      bool
	months                      []int64
}

func (t tally) add(o tally) tally {
	t.total, t.goal, t.cost, t.credited = t.total+o.total, t.goal+o.goal, t.cost+o.cost, t.credited+o.credited
	t.costSeen, t.creditedSeen = t.costSeen || o.costSeen, t.creditedSeen || o.creditedSeen
	for len(t.months) < len(o.months) {
		t.months = append(t.months, 0)
	}
	for i, v := range o.months {
		t.months[i] += v
	}
	return t
}

// split shares one activity's tally between its values; Not filled in takes it when it has none.
func (t tally) split(value allwork.AttrValue) map[string]tally {
	totals, goals, costs := shares(t.total, value), shares(t.goal, value), shares(t.cost, value)
	credits := shares(t.credited, value)
	out := make(map[string]tally, len(totals))
	for key := range totals {
		out[key] = tally{total: totals[key], goal: goals[key], cost: costs[key], credited: credits[key],
			costSeen: t.costSeen, creditedSeen: t.creditedSeen, months: make([]int64, len(t.months))}
	}
	for i, v := range t.months {
		for key, part := range shares(v, value) {
			out[key].months[i] = part
		}
	}
	return out
}

// tallyOf takes one activity's figures as Revenue's ranked list shows its row, so a league row and that row agree.
func tallyOf(s revenue.ActivitySeries, cost, credited *int64) tally {
	own := revenue.OwnFigureOf(s, revenue.RevenueMeasure())
	out := tally{total: valueOf(own.Total), goal: valueOf(own.Goal)}
	for _, m := range sumSeries([]revenue.ActivitySeries{s}, revenuePick()).months {
		out.months = append(out.months, m.actualOrProjected)
	}
	if cost != nil {
		out.cost, out.costSeen = *cost, true
	}
	if credited != nil && cost != nil {
		out.credited, out.creditedSeen = *credited, true
	}
	return out
}

func valuesOf(s revenue.ActivitySeries, segment string) allwork.AttrValue {
	return s.Attributes[segment]
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
