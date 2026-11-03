package summary

import (
	"context"
	"slices"

	"mapp/internal/allwork"
	"mapp/internal/measure"
	"mapp/internal/measure/attribution"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

const (
	reasonNoCost       = "No cost recorded"
	reasonNoFinance    = "Financial data of these plans is not shown to you"
	reasonNoAttributed = "No revenue is credited to these activities"
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

type ROIBasis = attribution.Stamp

// leagueView is one league request's read: the series, their costs and, for the ROI table, 050's credits.
type leagueView struct {
	view
	costs    map[string]*int64
	credited *attribution.Credited
}

func (s *Service) League(ctx context.Context, a actor.Actor, f measure.Filter, table string) (LeagueTable, error) {
	l, err := ParseLeague(table, f.Own)
	if err != nil {
		return LeagueTable{}, err
	}
	var out LeagueTable
	err = s.tx.Read(ctx, func(ctx context.Context) error {
		lv, readErr := s.readLeague(ctx, a, f, l)
		if readErr != nil {
			return readErr
		}
		out = lv.table(newBuilder(lv.scope, f.Period), l)
		return nil
	})
	return out, err
}

func (s *Service) readLeague(ctx context.Context, a actor.Actor, f measure.Filter, l League) (leagueView, error) {
	v, err := s.readSeries(ctx, a, f, l.Category)
	if err != nil {
		return leagueView{}, err
	}
	costs, err := s.costs(ctx, a, v)
	if err != nil || l.Table != TableROI {
		return leagueView{view: v, costs: costs}, err
	}
	credited, err := s.credits(ctx, v)
	return leagueView{view: v, costs: costs, credited: &credited}, err
}

func (lv leagueView) table(b builder, l League) LeagueTable {
	segments := segmentsOf(lv.scope.Attributes)
	out := LeagueTable{Table: l.Table, Segments: segments, Rows: []LeagueRow{}, currency: b.display.Currency()}
	chosen := chosenSegment(segments, l.Segment)
	var total tally
	byValue := map[string]tally{}
	for _, s := range lv.series {
		own := tallyOf(s, lv.costs[s.ID], lv.creditOf(s.ID))
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
	out.Reason = lv.reasonOf(l.Table, out.Total, total)
	if lv.credited != nil {
		stamp := attribution.ActualStamp(lv.credited.Model)
		out.ROI = &stamp
	}
	return out
}

func (lv leagueView) creditOf(activityID string) *int64 {
	if lv.credited == nil {
		return nil
	}
	amount, found := lv.credited.ByActivity[activityID]
	if !found {
		return nil
	}
	cents := amount.Cents()
	return &cents
}

// reasonOf says why a cost or ROI table shows dashes, in the order a planner would fix it.
func (lv leagueView) reasonOf(table string, shown any, t tally) *string {
	dashable := table == TableCost || table == TableROI
	reason := ""
	switch {
	case !dashable || shown != nil:
		return nil
	case !slices.ContainsFunc(lv.series, func(s revenue.ActivitySeries) bool { return lv.seesFinance(s.PlanID) }):
		reason = reasonNoFinance
	case !t.costSeen || t.cost <= 0:
		reason = reasonNoCost
	default:
		reason = reasonNoAttributed
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
	case TableROI:
		whole = roiOf(t)
	}
	if whole == nil {
		return nil
	}
	v := int64(*whole)
	return &v
}

// roiOf is 050's ROI on a tally's credited revenue and actual cost; "—" without either.
func roiOf(t tally) *int {
	if !t.costSeen || t.cost <= 0 || !t.creditedSeen {
		return nil
	}
	cost := money.FromCents(t.cost)
	return attribution.ROI(money.FromCents(t.credited), &cost)
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
