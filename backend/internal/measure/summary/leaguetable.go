package summary

import (
	"context"
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
)

const (
	reasonNoCost                   = "No cost recorded"
	reasonNoFinance                = "Financial data of these plans is not shown to you"
	reasonAttributionNotConfigured = "Attribution is not configured yet"
)

type LeagueTable struct {
	Table    string      `json:"table"`
	Segment  *Segment    `json:"segment"`
	Segments []Segment   `json:"segments"`
	Rows     []LeagueRow `json:"rows"`
	Total    any         `json:"total"`
	ROI      *ROIBasis   `json:"roi"`
	Reason   *string     `json:"reason"`
	every    []LeagueRow
	currency string
}

type LeagueRow struct {
	Key   string `json:"key"`
	Name  string `json:"name"`
	Value any    `json:"value"`
	Trend []any  `json:"trend"`
}

type ROIBasis struct {
	Model string            `json:"model"`
	Basis attribution.Basis `json:"basis"`
}

// leagueView is one league request's read: the series and their costs.
type leagueView struct {
	view
	costs map[string]*int64
}

func (s *Service) League(ctx context.Context, a actor.Actor, f measure.Filter, table string) (LeagueTable, error) {
	l, err := ParseLeague(table, f.Own)
	if err != nil {
		return LeagueTable{}, err
	}
	var out LeagueTable
	err = s.tx.Read(ctx, func(ctx context.Context) error {
		lv, readErr := s.readLeague(ctx, a, f, l.Category)
		if readErr != nil {
			return readErr
		}
		out = lv.table(newBuilder(lv.scope, f.Period), l)
		return nil
	})
	return out, err
}

func (s *Service) readLeague(ctx context.Context, a actor.Actor, f measure.Filter, category string) (leagueView, error) {
	v, err := s.readSeries(ctx, a, f, category)
	if err != nil {
		return leagueView{}, err
	}
	costs, err := s.costs(ctx, a, v)
	return leagueView{view: v, costs: costs}, err
}

func (lv leagueView) table(b builder, l League) LeagueTable {
	segments := segmentsOf(lv.scope.Attributes)
	out := LeagueTable{Table: l.Table, Segments: segments, Rows: []LeagueRow{}, currency: b.display.Currency()}
	chosen := chosenSegment(segments, l.Segment)
	var total tally
	byValue := map[string]tally{}
	for _, s := range lv.series {
		own := tallyOf(s, lv.costs[s.ID])
		total = total.add(own)
		for key, part := range own.split(valuesOf(s, chosen.ID)) {
			byValue[key] = byValue[key].add(part)
		}
	}
	if chosen.ID != "" {
		out.Segment = &chosen
		out.every = b.rows(l.Table, byValue, optionNames(lv.scope.Attributes, chosen.ID))
		out.Rows = out.every[:min(leagueSize, len(out.every))]
	}
	out.Total = b.shown(l.Table, figureOf(l.Table, total))
	out.Reason = lv.reasonOf(l.Table, out.Total)
	return out
}

// reasonOf says why a cost or ROI table shows dashes; ROI waits for 050's crediting, as Revenue's does.
func (lv leagueView) reasonOf(table string, total any) *string {
	reason := ""
	switch {
	case table == TableROI:
		reason = reasonAttributionNotConfigured
	case table != TableCost || total != nil:
		return nil
	case !slices.ContainsFunc(lv.series, func(s revenue.ActivitySeries) bool { return lv.seesFinance(s.PlanID) }):
		reason = reasonNoFinance
	default:
		reason = reasonNoCost
	}
	return &reason
}

func chosenSegment(segments []Segment, id string) Segment {
	for _, s := range segments {
		if s.ID == id || (id == "" && s.Level == string(allwork.LevelActivity)) {
			return s
		}
	}
	if id == "" && len(segments) > 0 {
		return segments[0]
	}
	return Segment{}
}

func (b builder) rows(table string, byValue map[string]tally, names map[string]string) []LeagueRow {
	rows := make([]leagueRow, 0, len(byValue))
	for key, t := range byValue {
		name, found := names[key]
		if !found {
			name = key
		}
		rows = append(rows, leagueRow{Key: key, Name: name, Value: figureOf(table, t)})
	}
	out := []LeagueRow{}
	for _, r := range ranked(rows) {
		row := LeagueRow{Key: r.Key, Name: r.Name, Value: b.shown(table, r.Value), Trend: []any{}}
		for _, month := range byValue[r.Key].months {
			row.Trend = append(row.Trend, b.money(month))
		}
		out = append(out, row)
	}
	return out
}

// figureOf is the table's figure for sorting: cents for revenue and cost, a whole per cent for the others.
func figureOf(table string, t tally) *int64 {
	var whole *int
	switch table {
	case TableRevenue:
		return &t.total
	case TableCost:
		if !t.costSeen || t.cost == 0 {
			return nil
		}
		return &t.cost
	case TablePerformance:
		whole = performanceOf(t.total, t.goal).Percent
	}
	if whole == nil {
		return nil
	}
	v := int64(*whole)
	return &v
}

func (b builder) shown(table string, v *int64) any {
	switch {
	case v == nil:
		return nil
	case table == TableRevenue || table == TableCost:
		return b.money(*v)
	default:
		return *v
	}
}
