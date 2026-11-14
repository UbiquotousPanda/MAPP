package summary

import (
	"context"

	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/sheet"
)

// ReportEntry is the Summary report as the hub's registry holds it.
type ReportEntry struct {
	service *Service
}

func NewReport(s *Service) *ReportEntry {
	return &ReportEntry{service: s}
}

func (r *ReportEntry) Key() string      { return measure.KeySummary }
func (r *ReportEntry) Available() bool  { return true }
func (r *ReportEntry) Params() []string { return Params() }

// Sheets gives every widget in page order; each league table uses the segment its own address parameter names.
func (r *ReportEntry) Sheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	var out []measure.WidgetSheet
	err := r.service.tx.Read(ctx, func(ctx context.Context) error {
		var sheetsErr error
		out, sheetsErr = r.sheets(ctx, a, f)
		return sheetsErr
	})
	return out, err
}

func (r *ReportEntry) sheets(ctx context.Context, a actor.Actor, f measure.Filter) ([]measure.WidgetSheet, error) {
	q, err := ParseQuery(f.Own)
	if err != nil {
		return nil, err
	}
	view, err := r.service.Report(ctx, a, f)
	if err != nil {
		return nil, err
	}
	out := []measure.WidgetSheet{
		{Key: "revenue", Sheet: revenueSheet(view.Revenue, view.currency)},
		{Key: "trend", Sheet: trendSheet(view.Revenue, view.currency)},
		{Key: "funnel", Sheet: funnelSheet(view.Funnel, view.currency)},
		{Key: "conversion", Sheet: conversionSheet(view.Funnel)},
	}
	for _, table := range tables() {
		s, err := r.leagueSheet(ctx, a, leagueFilter(f, q, table), table)
		if err != nil {
			return nil, err
		}
		out = append(out, measure.WidgetSheet{Key: "league" + tableKey(table), Sheet: s})
	}
	return out, nil
}

func (r *ReportEntry) leagueSheet(ctx context.Context, a actor.Actor, f measure.Filter, table string) (sheet.Sheet, error) {
	l, err := r.service.League(ctx, a, f, table)
	return leagueSheet(l), err
}

// leagueFilter turns the table's own segment parameter into the league request's segment.
func leagueFilter(f measure.Filter, q Query, table string) measure.Filter {
	out := f
	out.Own = map[string][]string{}
	if q.Category != "" {
		out.Own[paramCategory] = []string{q.Category}
	}
	if segment := q.Segments[table]; segment != "" {
		out.Own[paramSegment] = []string{segment}
	}
	return out
}

func tableKey(table string) string {
	return map[string]string{TableRevenue: wordRevenue, TablePerformance: "Performance", TableCost: "Cost",
		TableROI: "Roi"}[table]
}
