package revenue_test

import (
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure"
	"mapp/internal/measure/revenue"
)

func describedBy(t *testing.T, r measure.Report, own url.Values) [][2]string {
	t.Helper()
	described, ok := r.(measure.Described)
	if !ok {
		t.Fatalf("%s says nothing of its own parameters in About this export", r.Key())
	}
	lines, err := described.Describe(t.Context(), priya, own)
	if err != nil {
		t.Fatalf("Describe: %v", err)
	}
	return lines
}

func TestExportNotes_SayTheCategoryByNameAndTheSortInWords_FR019_039FR022(t *testing.T) {
	t.Parallel()
	s := newFixtureWithCategories(twoCategoryScope(), fakeGoals{},
		fakeCategories{{ID: "CAT-1", Name: "Asset", ActivityTypeIDs: []string{"AT-Asset"}}})

	got := describedBy(t, revenue.NewRevenueReport(s), url.Values{"category": {"CAT-1"}, "sort": {"actualRevenue"},
		"order": {"asc"}, "q": {"fleet"}})
	want := [][2]string{{"Category", "Asset"}, {"Sort by", "Actual"}, {"Order", "Low to high"}, {"Search", "fleet"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Revenue's notes (-want +got):\n%s", diff)
	}
	got = describedBy(t, revenue.NewRevenueReport(s), nil)
	want = [][2]string{{"Category", "All categories"}, {"Sort by", "Projected"}, {"Order", "High to low"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Revenue's notes by default (-want +got):\n%s", diff)
	}
}

func TestExportNotes_SayTheFunnelStage_FR015_039FR022(t *testing.T) {
	t.Parallel()
	s := newFixtureWithCategories(twoCategoryScope(), fakeGoals{}, fakeCategories{})

	got := describedBy(t, revenue.NewFunnelReport(s), url.Values{"category": {"uncategorised"}, "stage": {"mql"},
		"sort": {"actual"}})
	want := [][2]string{{"Category", "Uncategorised"}, {"Stage", "MQL"}, {"Sort by", "Actual"}, {"Order", "High to low"}}
	if diff := cmp.Diff(want, got); diff != "" {
		t.Errorf("Funnel stages' notes (-want +got):\n%s", diff)
	}
}
