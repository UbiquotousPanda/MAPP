package revenue_test

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

// July 10,000.00 and 40 INQ are past; August, the month in progress, adds 5,000.00 and 20 INQ.
func TestCards_ActualOrProjectedKeepsTheMonthInProgressWithoutAProjection_FR010_FR009(t *testing.T) {
	t.Parallel()
	f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}

	revenueFacts := julyAndAugustFacts("revenue", 1_000_000, 500_000)
	s := newFixtureAt(midAugust, activityWithoutGoalsScope(), fakeGoals{}, revenueFacts)
	report, err := s.Report(t.Context(), priya, f)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if got := centsOf(report.Cards.Projected.Value); got != 1_500_000 {
		t.Errorf("revenue: actual or projected = %d cents, want every counted fact, 1500000", got)
	}

	s = newFixtureAt(midAugust, activityWithoutGoalsScope(), fakeGoals{}, julyAndAugustFacts(revenue.StageINQ, 40, 20))
	funnel, err := s.FunnelReport(t.Context(), priya, f, revenue.StageINQ)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	if v := funnel.Cards.Projected.Value; v == nil || *v != 60 {
		t.Errorf("INQ: actual or projected = %v, want every counted fact, 60", deref(v))
	}
}
