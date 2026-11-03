package summary

import (
	"context"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/actor"
)

func TestLeague_ROIDashSaysWhy_048_FR015_050_FR007(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		change func(f *fakes)
		want   string
	}{
		{"no plan's financial data is shown", func(f *fakes) { f.scope.Choices.SeesFinance = false }, reasonNoFinance},
		{"nothing paid in the year", func(f *fakes) { f.spend = nil }, reasonNoCost},
		{"no revenue credited", func(f *fakes) { f.credits = nil }, reasonNoAttributed},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := withSegments()
			tt.change(f)

			got := league(t, f, TableROI, nil)

			if got.Total != nil || got.Reason == nil || *got.Reason != tt.want || got.ROI == nil {
				t.Errorf("ROI = total %v, reason %v, basis %v; want a dash with %q and the model named", got.Total,
					got.Reason, got.ROI, tt.want)
			}
		})
	}
}

func TestSummary_NothingCountedIsNullNotZero_048_FR017(t *testing.T) {
	t.Parallel()
	nothing := newFakes()
	nothing.series = nil

	got := report(t, nothing, measure.Filter{})

	if got.Revenue.ActualOrProjected != nil {
		t.Errorf("revenue actual or projected = %v with nothing in view, want null", got.Revenue.ActualOrProjected)
	}
	if last := got.Funnel.Stages[len(got.Funnel.Stages)-1]; last.Stage != StageRevenue || last.ActualOrProjected != nil {
		t.Errorf("funnel revenue stage = %+v, want null", last)
	}
}

func TestRevenueTrend_AMonthWithoutFactsHasNoActual_048_FR017(t *testing.T) {
	t.Parallel()
	f := newFakes()
	early := projected("A-1", planOne)
	for i := range 3 {
		early.Months[i].RevenueUSD.Actual = nil
	}
	f.series = []revenue.ActivitySeries{early}

	trend := report(t, f, measure.Filter{}).Revenue.Trend

	if trend[0].Actual != nil || trend[3].Actual == nil {
		t.Errorf("January actual %v, April actual %v; want no actual for a month with no fact, April's counted",
			trend[0].Actual, trend[3].Actual)
	}
}

func TestConversion_NoRateIsNotNoGoal_048_C1(t *testing.T) {
	t.Parallel()
	totals := map[Stage]Figures{StageINQ: {Actual: 0, Goal: 100}, StageMQL: {Actual: 0, Goal: 3}}

	got := conversions([]Stage{StageINQ, StageMQL}, totals)

	if len(got) != 1 || got[0].Rate != nil || got[0].Goal == nil || got[0].Variance != nil {
		t.Errorf("conversions() = %+v, want no rate, the goal 3.0 and no word: the rate is missing, not the goal", got)
	}
}

func TestStates_NotApproved_048_FR018(t *testing.T) {
	t.Parallel()
	f := newFakes()
	held := projected("A-1", planOne)
	held.FactsHeld = true
	f.series = []revenue.ActivitySeries{held}

	got := report(t, f, measure.Filter{}).States

	if len(got) == 0 || got[0] != StateNotApproved {
		t.Errorf("states = %q with every activity's facts held, want %q first, as Revenue says", got, StateNotApproved)
	}
}

func TestLeague_NoFinanceViewSaysSo_048_FR003(t *testing.T) {
	t.Parallel()
	f := withSegments()
	f.scope.Choices.SeesFinance = false

	got := league(t, f, TableCost, nil)

	if got.Total != nil || got.Reason == nil || *got.Reason != reasonNoFinance {
		t.Errorf("cost without financial access = total %v, reason %v; want a dash with %q", got.Total, got.Reason,
			reasonNoFinance)
	}
}

func TestSheets_LeagueSheetNamesFitExcel_048_FR021(t *testing.T) {
	t.Parallel()
	long := LeagueTable{Table: TablePerformance, Segment: &Segment{Label: "Channel / audience of the campaign"}}

	name := leagueSheet(long).Name

	if len([]rune(name)) > 31 || name != "Top Performance (%)" {
		t.Errorf("league sheet name = %q, want the figure alone within Excel's 31 characters", name)
	}
}

func (f *fakes) SegmentLabel(_ context.Context, id string) (string, error) {
	return map[string]string{regionAttr: "Region"}[id], nil
}

func TestDescribe_NamesSummarysOwnParameters_039_FR022(t *testing.T) {
	t.Parallel()
	own := url.Values{"category": {"CAT-1"}, "stage": {"mql"}, "revenueBy": {regionAttr}, "roiBy": {"ATTR-GONE"}}

	got, err := NewReport(withSegments().service()).Describe(t.Context(), actor.System, own)

	if err != nil {
		t.Fatalf("Describe() error = %v", err)
	}
	want := [][2]string{{"Category", "Events"}, {"Conversion trend", "MQL"}, {"Revenue by", "Region"},
		{"ROI (%) by", "ATTR-GONE"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Describe() (-want +got)\n%s", diff)
	}
}
