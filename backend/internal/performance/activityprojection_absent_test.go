package performance_test

import (
	"errors"
	"testing"

	"mapp/internal/performance"
	"mapp/internal/platform/date"
	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

func useGoals(t *testing.T, goals performance.GoalFacts) performance.Panel {
	t.Helper()
	f, _ := panelFixture(t)
	f.service.UseFigures(figuresStub{known: true, goals: goals})
	panel, err := f.service.ActivityPanel(t.Context(), alex, "A-1")
	if err != nil {
		t.Fatalf("ActivityPanel: %v", err)
	}
	return panel
}

type served struct {
	projected bool
	reason    string
	months    int
}

func assertNoProjection(t *testing.T, label string, got served) {
	t.Helper()
	if got.projected || got.reason != "noGoal" || got.months != 0 {
		t.Errorf("%s: %+v, want no figure, its reason noGoal and no months", label, got)
	}
}

func TestActivityPanel_AStageWithoutItsOwnSeriesSaysWhy_FR009_FR013(t *testing.T) {
	t.Parallel()
	inq := int64(1_200)

	panel := useGoals(t, performance.GoalFacts{INQ: &inq, SetLaterStagesMyself: true, PlanYear: 2026,
		ModelID: "MOD-1", Model: projectingModel()})

	if got := stageOf(t, panel, "inq"); got.Projected == nil {
		t.Fatalf("INQ = %+v, want its typed goal projected", got)
	}
	mql := stageOf(t, panel, "mql")
	assertNoProjection(t, "MQL", served{mql.Projected != nil, mql.ProjectedReason, len(mql.Months)})
	revenue := panel.Revenue
	assertNoProjection(t, "revenue", served{revenue.Projected != nil, revenue.ProjectedReason, len(revenue.Months)})
	if panel.Projection == nil {
		t.Errorf("stamp = nil, want the model named: INQ still projects")
	}
}

func TestActivityPanel_AnActivityOutsideThePlanYearClaimsNoProjection_FR013(t *testing.T) {
	t.Parallel()
	inq := int64(365_000)
	start, end := date.MustParse("2027-01-01"), date.MustParse("2027-12-31")

	panel := useGoals(t, performance.GoalFacts{INQ: &inq, PlanYear: 2026, ModelID: "MOD-1",
		Model: projectingModel(), StartDate: &start, EndDate: &end})

	if panel.Projection != nil {
		t.Errorf("stamp = %+v, want none: nothing projects, so no model stands behind a figure", panel.Projection)
	}
	for _, stage := range panel.Stages {
		assertNoProjection(t, stage.Stage, served{stage.Projected != nil, stage.ProjectedReason, len(stage.Months)})
	}
	revenue := panel.Revenue
	assertNoProjection(t, "revenue", served{revenue.Projected != nil, revenue.ProjectedReason, len(revenue.Months)})
}

// The panel's actuals are in US dollars; a revenue goal in another currency is refused, never relabelled.
func TestActivityPanel_RefusesARevenueGoalInAnotherCurrency_FR007(t *testing.T) {
	t.Parallel()
	f, _ := panelFixture(t)
	eur := money.Money{Amount: money.FromCents(4_000_000), Currency: "EUR"}
	f.service.UseFigures(figuresStub{known: true, goals: performance.GoalFacts{Revenue: &eur,
		SetLaterStagesMyself: true, PlanYear: 2026, ModelID: "MOD-1", Model: projectingModel()}})

	panel, err := f.service.ActivityPanel(t.Context(), alex, "A-1")

	if !errors.Is(err, projection.ErrMixedCurrencies) {
		t.Errorf("ActivityPanel = %+v, %v, want ErrMixedCurrencies", panel.Revenue.Projected, err)
	}
}

func TestActivityPanel_AGoalOfZeroProjectsNothing_FR013_047C17(t *testing.T) {
	t.Parallel()
	zero := int64(0)

	panel := useGoals(t, performance.GoalFacts{INQ: &zero, PlanYear: 2026, ModelID: "MOD-1", Model: projectingModel()})

	if panel.Projection != nil {
		t.Errorf("stamp = %+v, want none: a goal of zero is no goal, so no model stands behind a figure", panel.Projection)
	}
	for _, stage := range panel.Stages {
		assertNoProjection(t, stage.Stage, served{stage.Projected != nil, stage.ProjectedReason, len(stage.Months)})
	}
	revenue := panel.Revenue
	assertNoProjection(t, "revenue", served{revenue.Projected != nil, revenue.ProjectedReason, len(revenue.Months)})
}
