package summary

import (
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/allwork"
	"mapp/internal/financials"
	"mapp/internal/measure"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/money"
)

const (
	regionAttr = "ATTR-R"
	unitAttr   = "ATTR-P"
)

// withSegments gives A-1 two regions, leaves A-2 without one, and pays 300.00 on A-1's line item in March
// (and 999.00 the year before, which no table counts).
func withSegments() *fakes {
	f := newFakes()
	f.scope.Attributes = []allwork.Attribute{
		{ID: unitAttr, Label: "Business unit", Level: allwork.LevelPlan, Type: allwork.TypeSingleChoice, Active: true},
		{ID: regionAttr, Label: "Region", Level: allwork.LevelActivity, Type: allwork.TypeMultipleChoice, Active: true,
			Options: []allwork.Option{{ID: "O-1", Label: "North"}, {ID: "O-2", Label: "South"}}},
		{ID: "ATTR-Y", Label: "Partner", Level: allwork.LevelActivity, Type: allwork.TypeYesNo, Active: true},
	}
	f.series[0].Attributes = map[string]allwork.AttrValue{regionAttr: {OptionIDs: []string{"O-2", "O-1"}}}
	f.scope.Nodes = append(f.scope.Nodes, allwork.Node{ID: "L-1", ParentID: "A-1", Level: allwork.LevelLineItem})
	f.spend = map[string]map[string]financials.Facts{"L-1": {
		"2026-03": {Paid: money.FromCents(30_000)}, "2025-12": {Paid: money.FromCents(99_900)},
	}}
	return f
}

func league(t *testing.T, f *fakes, table string, own url.Values) LeagueTable {
	t.Helper()
	got, err := f.service().League(t.Context(), actor.System, measure.Filter{Own: own}, table)
	if err != nil {
		t.Fatalf("League(%s) error = %v", table, err)
	}
	return got
}

func rowSummary(rows []LeagueRow) []string {
	var out []string
	for _, r := range rows {
		out = append(out, r.Name)
	}
	return out
}

func TestLeague_Revenue_048_C4_C5(t *testing.T) {
	t.Parallel()

	got := league(t, withSegments(), TableRevenue, nil)

	if got.Segment == nil || got.Segment.ID != regionAttr || len(got.Segments) != 2 || got.Segments[1].ID != unitAttr {
		t.Fatalf("segment %+v of %+v, want Region first and Business unit second", got.Segment, got.Segments)
	}
	if diff := cmp.Diff([]string{"North", "South", "Not filled in"}, rowSummary(got.Rows)); diff != "" {
		t.Errorf("rows (-want +got)\n%s", diff)
	}
}

func TestLeague_RevenueValuesAndTrend_048_C5(t *testing.T) {
	t.Parallel()

	got := league(t, withSegments(), TableRevenue, nil)

	if !cmp.Equal(usd(60_000), got.Rows[0].Value, amounts()) || !cmp.Equal(usd(140_000), got.Total, amounts()) {
		t.Errorf("North %v and total %v, want 600.00 of 1400.00", got.Rows[0].Value, got.Total)
	}
	if len(got.Rows[0].Trend) != monthsInAll || got.ROI != nil || got.Reason != nil {
		t.Errorf("trend of %d months, ROI %v, reason %v", len(got.Rows[0].Trend), got.ROI, got.Reason)
	}
}

func TestLeague_CostAndROI_048_FR015(t *testing.T) {
	t.Parallel()

	cost := league(t, withSegments(), TableCost, nil)
	roi := league(t, withSegments(), TableROI, nil)

	if !cmp.Equal(usd(30_000), cost.Total, amounts()) || !cmp.Equal(usd(15_000), cost.Rows[0].Value, amounts()) {
		t.Errorf("cost total %v and North %v, want 300.00 and 150.00", cost.Total, cost.Rows[0].Value)
	}
	if roi.Total != nil || roi.Rows[0].Value != nil || roi.ROI != nil {
		t.Errorf("ROI total %v, North %v, basis %v; want dashes and no model until 050's crediting", roi.Total,
			roi.Rows[0].Value, roi.ROI)
	}
}

func TestLeague_NoFinanceView_048_FR003(t *testing.T) {
	t.Parallel()
	f := withSegments()
	f.scope.Choices.FinancePlans = []string{planTwo}

	got := league(t, f, TableCost, nil)

	if got.Total != nil || got.Reason == nil || *got.Reason != reasonNoCost || got.Rows[0].Value != nil {
		t.Errorf("cost without plan one's finance = total %v, reason %v, first row %v; want dashes", got.Total,
			got.Reason, got.Rows[0].Value)
	}
}

func TestLeague_PerformanceAndSegmentChoice_048_C6(t *testing.T) {
	t.Parallel()

	performance := league(t, withSegments(), TablePerformance, url.Values{"segment": {unitAttr}})
	unknown := league(t, withSegments(), TableRevenue, url.Values{"segment": {"ATTR-GONE"}})

	if performance.Segment.ID != unitAttr || performance.Total != int64(14) {
		t.Errorf("performance by unit = segment %v, total %v; want ATTR-P and 14", performance.Segment, performance.Total)
	}
	if diff := cmp.Diff([]string{"Not filled in"}, rowSummary(performance.Rows)); diff != "" {
		t.Errorf("performance rows (-want +got)\n%s", diff)
	}
	if unknown.Segment != nil || len(unknown.Rows) != 0 {
		t.Errorf("an unknown segment gave %v with %d rows, want none", unknown.Segment, len(unknown.Rows))
	}
}

func TestLeague_RefusesAnUnknownTable_048_FR004(t *testing.T) {
	t.Parallel()
	if _, err := withSegments().service().League(t.Context(), actor.System, measure.Filter{}, "deals"); err == nil {
		t.Error("League(deals) gave no error, want the problem")
	}
}

func TestLeague_NoSegmentsIsAnEmptyList_048_C4(t *testing.T) {
	t.Parallel()

	got := league(t, newFakes(), TableRevenue, nil)

	if got.Segments == nil || len(got.Segments) != 0 || got.Segment != nil || len(got.Rows) != 0 {
		t.Errorf("without segment attributes = segments %#v, segment %v, %d rows; want an empty list and no rows",
			got.Segments, got.Segment, len(got.Rows))
	}
}
