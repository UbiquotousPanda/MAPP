package revenue_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/measure/ranking"
	"mapp/internal/measure/revenue"
)

// twoModelGoals projects A-1 (P-1) with Lubricants 1.0 and A-2 (P-2) with Mobility 1.0.
func twoModelGoals() fakeGoals {
	mobility := lubricantsModel()
	mobility.Name = "Mobility 1.0"
	return fakeGoals{"A-1": revenue.ActivityGoals{Model: lubricantsModel()}, "A-2": revenue.ActivityGoals{Model: mobility}}
}

type ownerAndModel struct{ Owner, Model string }

func ownerAndModelOf(owner, model string) ownerAndModel { return ownerAndModel{owner, model} }

func rowsOf[F any](groups []ranking.Group[F], model func(F) *revenue.Stamp) map[string]ownerAndModel {
	out := map[string]ownerAndModel{}
	for _, g := range groups {
		out["totals"] = ownerAndModelOf("", nameOf(model(g.Totals)))
		for _, e := range g.Entries {
			owner := ""
			if e.Owner != nil {
				owner = e.Owner.Name
			}
			out[e.ID] = ownerAndModelOf(owner, nameOf(model(e.Figures)))
		}
	}
	return out
}

func nameOf(s *revenue.Stamp) string {
	if s == nil {
		return ""
	}
	return s.ModelName
}

func TestRankedEntries_CarryTheirOwnerAndTheirModel_049_FR012_SC006(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoModelGoals(), nil)
	q := revenue.RankedQuery{Sort: revenue.SortProjectedRevenue, Order: revenue.OrderDesc, Size: 10, Page: 1}
	f := measure.Filter{Show: "activity"}

	revenueList, err := s.RankedRevenue(t.Context(), priya, f, q)
	if err != nil {
		t.Fatalf("RankedRevenue: %v", err)
	}
	q.Sort = revenue.SortProjected
	funnelList, err := s.RankedFunnel(t.Context(), priya, f, q)
	if err != nil {
		t.Fatalf("RankedFunnel: %v", err)
	}

	want := map[string]ownerAndModel{
		"A-1":    {"Priya Raman", "Lubricants 1.0"},
		"A-2":    {"", "Mobility 1.0"},
		"totals": {"", ""},
	}
	for name, got := range map[string]map[string]ownerAndModel{
		"revenue": rowsOf(revenueList.Groups, func(f revenue.RevenueFigures) *revenue.Stamp { return f.Projection }),
		"funnel":  rowsOf(funnelList.Groups, func(f revenue.FunnelFigures) *revenue.Stamp { return f.Projection }),
	} {
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("%s rows, owner and model; the totals mix two models (-want +got):\n%s", name, diff)
		}
	}
}

func TestReports_NameEveryModelInView_049_SC006(t *testing.T) {
	t.Parallel()
	s := newFixtureWith(twoPlanScope(), twoModelGoals(), nil)

	report, err := s.Report(t.Context(), priya, measure.Filter{})
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	funnel, err := s.FunnelReport(t.Context(), priya, measure.Filter{}, "inq")
	if err != nil {
		t.Fatalf("FunnelReport: %v", err)
	}

	want := []string{"Lubricants 1.0", "Mobility 1.0"}
	for name, stamps := range map[string][]revenue.Stamp{"revenue": report.Projections, "funnel": funnel.Projections} {
		var got []string
		for _, st := range stamps {
			got = append(got, st.ModelName)
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("%s projections, every model in view by name (-want +got):\n%s", name, diff)
		}
	}
	if nameOf(report.Projection) != "Lubricants 1.0" {
		t.Errorf("revenue projection = %v, want the first by name, kept for compatibility", report.Projection)
	}
}

func TestConversionCard_SaysWhyItIsEmpty_049_FR009_FR017(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		s    *revenue.Service
		want string
	}{
		{"nothing counted in MQL", reasonsFixture("approved", everySource, nil), revenue.ReasonNoData},
		{"no MQL source", reasonsFixture("approved", []string{"inq", "revenue"}, nil), revenue.ReasonNoSource},
		{"MQL counted, INQ not", reasonsFixture("approved", everySource, julyAndAugustFacts("mql", 3, 2)),
			revenue.ReasonNoPreviousStage},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := tt.s.FunnelReport(t.Context(), priya, measure.Filter{}, "mql")
			if err != nil {
				t.Fatalf("FunnelReport: %v", err)
			}

			if got.Cards.Conversion.Value != nil || got.Cards.Conversion.Reason != tt.want {
				t.Errorf("conversion = %v with reason %q, want no value and %q", got.Cards.Conversion.Value,
					got.Cards.Conversion.Reason, tt.want)
			}
		})
	}
}
