package app

import (
	"slices"
	"testing"

	"mapp/internal/performance"
)

func TestSourcedMeasures_NameTheStagesAndRevenueAModelsSourcesSupply_049C20(t *testing.T) {
	t.Parallel()
	suppliers := []performance.Supplier{
		{Meaning: performance.MeaningStage, Stage: "mql"},
		{Meaning: performance.MeaningRevenue},
		{Meaning: performance.MeaningWebMetric},
	}

	got := sourcedMeasures(suppliers)

	if !slices.Equal(got, []string{"mql", "revenue"}) {
		t.Errorf("sourced = %v, want [mql revenue]: a web metric supplies no report measure", got)
	}
}
