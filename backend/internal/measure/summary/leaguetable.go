package summary

import (
	"context"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

const reasonNoCost = "No cost recorded"

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

// leagueView is one league request's read: the series, their costs and the designated attribution model.
type leagueView struct {
	view
	costs map[string]*int64
	model attribution.Model
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
	v, err := s.read(ctx, a, f, category)
	if err != nil {
		return leagueView{}, err
	}
	costs, err := s.costs(ctx, a, v)
	if err != nil {
		return leagueView{}, err
	}
	model, err := s.deps.Attribution.Designated(ctx)
	return leagueView{view: v, costs: costs, model: model}, err
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
	if l.Table == TableROI {
		out.ROI = &ROIBasis{Model: lv.model.Name(), Basis: attribution.BasisActual}
	}
	if out.Total == nil && (l.Table == TableCost || l.Table == TableROI) {
		reason := reasonNoCost
		out.Reason = &reason
	}
	return out
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
	default:
		cost := money.FromCents(t.cost)
		whole = attribution.ROI(money.FromCents(t.actual), &cost)
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
