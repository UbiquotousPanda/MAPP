package revenue_test

import (
	"testing"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

var everySource = []string{"inq", "mql", "revenue"}

func reasonsFixture(status string, sourced []string, facts []revenue.FactTotal) *revenue.Service {
	sc := oneActivityScope()
	sc.Nodes[0].Status = status
	goals := fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel(), Sourced: sourced}}
	return newFixtureWith(sc, goals, facts)
}

func reportsOf(t *testing.T, s *revenue.Service) (revenue.RevenueReport, revenue.FunnelReport) {
	t.Helper()
	r, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	f, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, revenue.StageINQ)
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}
	return r, f
}

func TestActualCards_SayNoDataYetWhenNothingIsCounted_FR009(t *testing.T) {
	t.Parallel()
	r, f := reportsOf(t, reasonsFixture("approved", everySource, nil))

	if r.Cards.Actual.Value != nil || r.Cards.Actual.Reason != revenue.ReasonNoData {
		t.Errorf("revenue actual card = %+v, want no value and %q, never 0.00", r.Cards.Actual, revenue.ReasonNoData)
	}
	if f.Cards.Actual.Value != nil || f.Cards.Actual.Reason != revenue.ReasonNoData {
		t.Errorf("INQ actual card = %+v, want no value and %q, never 0", f.Cards.Actual, revenue.ReasonNoData)
	}
}

func TestActualCards_ShowARealZeroWhenTheCountedFactsSumToZero_FR009(t *testing.T) {
	t.Parallel()
	facts := []revenue.FactTotal{
		{ActivityID: "A-1", Stage: "revenue", Month: "2026-02", Currency: "USD", FactCount: 1},
		{ActivityID: "A-1", Stage: "inq", Month: "2026-02", FactCount: 1},
	}
	r, f := reportsOf(t, reasonsFixture("approved", everySource, facts))

	if r.Cards.Actual.Value == nil || r.Cards.Actual.Value.Amount.Cents() != 0 {
		t.Errorf("revenue actual card = %+v, want 0.00: a fact was counted", r.Cards.Actual)
	}
	if f.Cards.Actual.Value == nil || *f.Cards.Actual.Value != 0 {
		t.Errorf("INQ actual card = %+v, want 0: a fact was counted", f.Cards.Actual)
	}
}

func TestActualCards_SayTheActivitiesAreNotApprovedYet_FR008_049C20(t *testing.T) {
	t.Parallel()
	r, f := reportsOf(t, reasonsFixture("submitted", everySource, nil))

	if r.Cards.Actual.Reason != revenue.ReasonNotApproved || f.Cards.Actual.Reason != revenue.ReasonNotApproved {
		t.Errorf("actual reasons = %q and %q, want %q: the facts are held until approval",
			r.Cards.Actual.Reason, f.Cards.Actual.Reason, revenue.ReasonNotApproved)
	}
}

func TestActualCards_SayNoSourceSuppliesTheMeasure_FR008_049C20(t *testing.T) {
	t.Parallel()
	r, f := reportsOf(t, reasonsFixture("approved", []string{"revenue"}, nil))

	if r.Cards.Actual.Reason != revenue.ReasonNoData {
		t.Errorf("revenue actual reason = %q, want %q: a source supplies revenue", r.Cards.Actual.Reason, revenue.ReasonNoData)
	}
	if f.Cards.Actual.Reason != revenue.ReasonNoSource {
		t.Errorf("INQ actual reason = %q, want %q: no source supplies INQ", f.Cards.Actual.Reason, revenue.ReasonNoSource)
	}
}

func TestReport_WithoutGoalsOnUnapprovedActivitiesSaysNotApproved_FR008_049C20(t *testing.T) {
	t.Parallel()
	sc := activityWithoutGoalsScope()
	sc.Nodes[0].Status = "created"
	s := newFixtureWith(sc, fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}}, nil)

	r, f := reportsOf(t, s)

	if r.Reason != revenue.ReasonNotApproved || f.Reason != revenue.ReasonNotApproved {
		t.Errorf("report reasons = %q and %q, want %q", r.Reason, f.Reason, revenue.ReasonNotApproved)
	}
}

func TestReport_EveryActivityUnapprovedSaysSoAndKeepsItsGoalsAndProjection_FR008_049C20_049C22(t *testing.T) {
	t.Parallel()
	r, f := reportsOf(t, reasonsFixture("submitted", everySource, nil))

	if r.Reason != revenue.ReasonNotApproved || f.Reason != revenue.ReasonNotApproved {
		t.Errorf("report reasons = %q and %q, want %q: every activity in view awaits approval",
			r.Reason, f.Reason, revenue.ReasonNotApproved)
	}
	if r.Cards.Goal.Value == nil || r.Cards.Projected.Value == nil || f.Cards.Goal.Value == nil {
		t.Errorf("revenue goal %+v, projected %+v, INQ goal %+v, want values: goals and projections are planning figures",
			r.Cards.Goal, r.Cards.Projected, f.Cards.Goal)
	}
}
