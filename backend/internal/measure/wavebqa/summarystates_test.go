package wavebqa_test

import (
	"slices"
	"testing"

	"mapp/internal/platform/apitest"
)

func checkEmptyYear(t *testing.T, alexSees person) {
	t.Helper()
	got := summaryOf(t, alexSees, "year=2025")
	r := got.Revenue
	noCoverage := !slices.ContainsFunc(r.GoalCoverage, func(c coverage) bool { return c.Percent != nil })
	if r.PeriodLabel != "FY 2025" || r.Goal != nil || r.Performance != nil || r.Variance != "noGoal" || !noCoverage ||
		len(r.Trend) != 0 || len(got.Funnel.Conversions) != 0 {
		t.Errorf("Summary 2025, no plan in view = %+v, want no goal, performance, coverage, trend or conversion", r)
	}
}

func checkNothingCounted(t *testing.T, alexSees person) {
	t.Helper()
	for _, query := range []string{"year=2025", "owner=U-1004&plan=P-1001"} {
		got := summaryOf(t, alexSees, query)
		if got.Revenue.ActualOrProjected != nil ||
			slices.ContainsFunc(got.Funnel.Stages, func(st summaryStage) bool { return units(st.ActualOrProjected) != nil }) {
			t.Errorf("Summary %q, nothing in view: %q; want the actual or projected null in both sections, never 0.00",
				query, got.headline())
		}
		if cost := leagueOf(t, alexSees, "cost", query); cost.Reason != nil || units(cost.Total) != nil {
			t.Errorf("Summary cost league %q, nothing in view: total %s, reason %s; want neither: Alex sees every plan's finance",
				query, shown(units(cost.Total)), textOf(cost.Reason))
		}
	}
}

func checkNoActualUncounted(t *testing.T, alexSees person) {
	t.Helper()
	for _, query := range []string{"", "activityStatus=submitted"} {
		got := summaryOf(t, alexSees, query)
		if !slices.Contains(got.States, noPerfData) && !slices.Contains(got.States, notApproved) {
			continue
		}
		for _, p := range got.Revenue.Trend {
			if p.Actual != nil {
				t.Errorf("Summary %q, states %v: %s actual %s, want null with no fact counted", query, got.States, p.Key,
					p.Actual.Amount)
			}
		}
	}
}

func (r summaryRate) String() string {
	return r.Stage + " " + textOf(r.Rate) + " against " + textOf(r.Goal) + " " + textOf(r.Variance)
}

func checkNoRateWithoutActual(t *testing.T, alexSees person) {
	t.Helper()
	for _, query := range []string{"", "activityStatus=submitted"} {
		got := summaryOf(t, alexSees, query)
		if c := got.Funnel.Conversions; len(c) != 1 || c[0].Rate != nil || c[0].Goal == nil || c[0].Variance != nil {
			t.Errorf("Summary %q: conversions %v with no INQ actual, want the rate and its word null beside the goal, "+
				"never 0 %% or No goal", query, c)
		}
		for _, p := range got.Funnel.Trend.Periods {
			if p.State != summaryAhead && p.Rate != nil {
				t.Errorf("Summary %q: %s (%s) conversion %s with no INQ actual, want null", query, p.Key, p.State, *p.Rate)
			}
		}
	}
}

// TestWaveB_SummaryMissingIsNeverZero_048_FR017: no goal, no plan or no actual leaves the figure null, never 0.
func TestWaveB_SummaryMissingIsNeverZero_048_FR017(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	checkEmptyYear(t, alexSees)
	checkNothingCounted(t, alexSees)
	checkNoActualUncounted(t, alexSees)
	checkNoRateWithoutActual(t, alexSees)
	for _, table := range []string{"cost", "performance"} {
		for _, r := range leagueOf(t, alexSees, table, "").Rows {
			if v := units(r.Value); v != nil && *v == 0 {
				t.Errorf("Summary's %s league: %s at 0, want null where there is no %s", table, r.Name, table)
			}
		}
	}
}

type stateCase struct {
	who, query string
	want       []string
}

// TestWaveB_SummaryStatesNameTheirCause_048_FR018: the backend names the report state of each empty or partial view.
func TestWaveB_SummaryStatesNameTheirCause_048_FR018(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	for _, c := range []stateCase{
		{alex, "year=2025", []string{"noPlans"}},
		{alex, "owner=U-1004&plan=P-1001", []string{"nothingMatches"}},
		{alex, "", []string{noPerfData}},
		{lea, "", []string{noPerfData, noFinance}},
		{alex, "activityStatus=complete", []string{"noGoals", noPerfData}},
		{alex, "activityStatus=submitted", []string{notApproved}},
	} {
		if got := summaryOf(t, signIn(t, server, c.who), c.query).States; !slices.Equal(got, c.want) {
			t.Errorf("%s's Summary %q: states %v, want %v", c.who, c.query, got, c.want)
		}
	}
}
