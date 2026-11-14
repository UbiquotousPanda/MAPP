package revenue_test

import (
	"slices"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
	"mapp/internal/platform/money"
)

func TestActivitySeriesIn_ReturnsTheScopeItsSeriesWereReadIn_048C10(t *testing.T) {
	t.Parallel()
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}
	s := newFixtureAt(midAugust, oneActivityScope(), goals, julyAndAugustFacts("revenue", 1_000_000, 500_000))
	f := measure.Filter{Period: measure.PeriodMonth, Show: measure.ShowActivity}

	sc, series, err := s.ActivitySeriesIn(t.Context(), priya, f, "")
	if err != nil {
		t.Fatalf("ActivitySeriesIn: %v", err)
	}
	alone, err := s.ActivitySeries(t.Context(), priya, f, "")
	if err != nil {
		t.Fatalf("ActivitySeries: %v", err)
	}
	if diff := cmp.Diff(alone, series, cmpopts.EquateComparable(money.Amount{}, money.Percent{})); diff != "" {
		t.Errorf("series differ from ActivitySeries (-want +got):\n%s", diff)
	}
	if sc.Year != 2026 || len(series) != 1 || !slices.Contains(sc.Matched.Activities, series[0].ID) {
		t.Errorf("scope = year %d, matched %v; want 2026 with the series' activity %v", sc.Year, sc.Matched.Activities, series)
	}
}
