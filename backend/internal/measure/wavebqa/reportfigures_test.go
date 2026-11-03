package wavebqa_test

import (
	"encoding/csv"
	"net/http"
	"slices"
	"strings"
	"testing"
	"time"

	"mapp/internal/platform/apitest"
)

const (
	noPreviousStage = "noPreviousStage"
	notApproved     = "notApproved"
)

func noActualAnywhere(t *testing.T, alexSees person) {
	t.Helper()
	for _, show := range levels() {
		if slices.ContainsFunc(revenueRankedOf(t, alexSees, "show="+show).everyFigure(),
			func(f revenueFigures) bool { return f.Actual != nil }) {
			t.Errorf("Revenue at show=%s: an actual with no fact loaded, want null (FR-009)", show)
		}
		if slices.ContainsFunc(funnelRankedOf(t, alexSees, "show="+show).everyFigure(),
			func(f funnelFigures) bool { return f.Actual != nil }) {
			t.Errorf("Funnel stages at show=%s: an actual with no fact loaded, want null (FR-009)", show)
		}
	}
	for _, r := range reportsUnderTest() {
		months := r.shapeOf(t, alexSees, "")
		if months.cards.actual != nil || slices.ContainsFunc(months.periods, func(p point) bool { return p.actual != nil }) {
			t.Errorf("%s: actual card %s or a month's actual with no fact loaded, want null (FR-009)", r.name,
				shown(months.cards.actual))
		}
	}
}

func noGridOfZeros(t *testing.T, label string, s shape) {
	t.Helper()
	if s.cards.actual != nil || s.cards.projected != nil {
		t.Errorf("%s: cards %s, want actual and actual or projected null (FR-008)", label, s.cards)
	}
	for _, p := range s.periods {
		if p.goal != nil || p.actual != nil || p.projected != nil {
			t.Errorf("%s %s: %s, want every figure null (FR-008)", label, p.key, p.figures)
		}
	}
}

func nothingShown(r revenueFigures, f funnelFigures) bool {
	revenue := r.Goal == nil && r.Projected == nil && r.Performance == nil
	return revenue && f.Goal == nil && f.Projected == nil && f.Performance == nil && f.Conversion == nil
}

func noGoalNoFigure(t *testing.T, alexSees person, names ...string) {
	t.Helper()
	revenue, funnel := revenueRankedOf(t, alexSees, "show=activity").tops(), funnelRankedOf(t, alexSees, "show=activity").tops()
	for _, name := range names {
		i := slices.IndexFunc(revenue, func(e entry[revenueFigures]) bool { return e.Name == name })
		j := slices.IndexFunc(funnel, func(e entry[funnelFigures]) bool { return e.Name == name })
		if i < 0 || j < 0 || !nothingShown(revenue[i].Figures, funnel[j].Figures) {
			t.Errorf("%s, no goal: listed at %d and %d, want both lists to show goal, projected, performance null, never 0",
				name, i, j)
		}
	}
}

func conversionStated(t *testing.T, alexSees person) {
	t.Helper()
	for _, stage := range []string{"inq", "mql"} {
		report := funnelOf(t, alexSees, "stage="+stage)
		if c := report.Cards.Conversion; c.Value != nil || c.Reason != noPreviousStage {
			t.Errorf("Funnel stages %s conversion card = %+v, want null with %s: INQ has no actual", stage, c, noPreviousStage)
		}
		for _, f := range funnelRankedOf(t, alexSees, "show=activity&stage="+stage).everyFigure() {
			if f.Conversion != nil {
				t.Errorf("Funnel stages %s: a conversion of %v with no actual at INQ, want null", stage, *f.Conversion)
				break
			}
		}
	}
}

func emptyYearStated(t *testing.T, alexSees person) {
	t.Helper()
	revenue, funnel := revenueOf(t, alexSees, "year=2025"), funnelOf(t, alexSees, "year=2025")
	if revenue.Reason != "noData" || revenue.Cards.Goal.Value != nil || revenue.Cards.Goal.Reason != "noGoal" ||
		revenue.Cards.Performance.Value != nil {
		t.Errorf("Revenue 2025, no plan in view = %+v, want reason noData, goal and performance null with noGoal", revenue)
	}
	if funnel.Reason != "noData" || funnel.Cards.Goal.Value != nil || funnel.Cards.Performance.Value != nil {
		t.Errorf("Funnel stages 2025, no plan in view = %+v, want reason noData, goal and performance null", funnel)
	}
	noGridOfZeros(t, "Revenue 2025", revenue.shape())
	noGridOfZeros(t, "Funnel stages 2025", funnel.shape())
}

// TestWaveB_MissingIsNeverZero_FR009: without facts or goals every figure is null with its reason, never 0.
func TestWaveB_MissingIsNeverZero_FR009(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	noActualAnywhere(t, alexSees)
	noGoalNoFigure(t, alexSees, retargetingTest, tellusCaseStudies)
	conversionStated(t, alexSees)
	emptyYearStated(t, alexSees)
}

func exportedCostColumns(t *testing.T, alexSees person) {
	t.Helper()
	file := alexSees.expect(t, get(reportPath("/reports/revenue/export", "widget=ranked", "format=csv", "show=activity")),
		http.StatusOK)
	rows := csvRows(t, string(file.Body))
	if len(rows) < 2 || !slices.Equal(rows[0][7:], []string{"Actual cost", "ROI (%)"}) {
		t.Fatalf("the ranked export's columns = %v, want Actual cost and ROI (%%) last", rows)
	}
	for _, row := range rows[1:] {
		if row[7] != "—" || row[8] != "—" {
			t.Errorf("exported %s: actual cost %q, ROI %q, want —", row[2], row[7], row[8])
		}
	}
}

// TestWaveB_RoiNotConfigured_049_FR013: every actual cost and ROI is null, "Attribution is not configured yet", until 050 T007.
func TestWaveB_RoiNotConfigured_049_FR013(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for _, show := range levels() {
		for _, group := range []string{"none", "plan", "owner"} {
			list := revenueRankedOf(t, alexSees, joined("show="+show, "group="+group))
			costless(t, "Revenue at show="+show+" by "+group, list, notConfigured)
		}
	}
	exportedCostColumns(t, alexSees)
}

// TestWaveB_FunnelStageSelector_049_FR015: INQ then MQL, opening on INQ, never deals; every plan covered.
func TestWaveB_FunnelStageSelector_049_FR015(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	for query, stage := range map[string]string{"": "inq", "stage=inq": "inq", "stage=mql": "mql"} {
		got := funnelOf(t, alexSees, query)
		if got.Stage != stage || !slices.Equal(got.AvailableStages, []string{"inq", "mql"}) || got.UncoveredCount != 0 {
			t.Errorf("Funnel stages %q: stage %s of %v, %d plans uncovered; want %s of [inq mql], none uncovered",
				query, got.Stage, got.AvailableStages, got.UncoveredCount, stage)
		}
	}
}

func checkStamp(t *testing.T, label string, got *stamp, model servedModel) {
	t.Helper()
	if got == nil || *got != (stamp{model.Name, model.UpdatedAt}) {
		t.Errorf("%s: projection %+v, want %s changed %s (047 FR-012)", label, got, model.Name, model.UpdatedAt)
	}
}

// TestWaveB_ProjectionNamesItsModel_049_FR022: each plan's report names its own model and moves with the model's change.
func TestWaveB_ProjectionNamesItsModel_049_FR022(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	frame := frameOf(t, alexSees, "revenue")
	mobility := decode[servedModel](t, alexSees.expect(t, get("/models/MOD-1002"), http.StatusOK))
	checkStamp(t, "Revenue of "+mobilityPlan, revenueOf(t, alexSees, "plan="+frame.planID(mobilityPlan)).Projection, mobility)
	measureOnly := "plan=" + frame.planID(measurePlan)
	before := modelOf(t, alexSees)
	checkStamp(t, "Funnel stages of "+measurePlan, funnelOf(t, alexSees, measureOnly).Projection, before)

	server.Advance(time.Hour)
	saved := saveModel(t, alexSees, map[string]any{"inqToMqlVelocityMonths": 1})
	if saved.UpdatedAt == before.UpdatedAt {
		t.Fatalf("Alex's save left the model's last change at %s", saved.UpdatedAt)
	}
	checkStamp(t, "Revenue after Alex's change", revenueOf(t, alexSees, measureOnly).Projection, saved)
	checkStamp(t, "Funnel stages after Alex's change", funnelOf(t, alexSees, measureOnly).Projection, saved)
}

// csvRows are an exported CSV's rows after the notes and the blank line that ends them.
func csvRows(t *testing.T, file string) [][]string {
	t.Helper()
	_, table, _ := strings.Cut(strings.ReplaceAll(file, "\r\n", "\n"), "\n\n")
	reader := csv.NewReader(strings.NewReader(table))
	reader.FieldsPerRecord = -1
	rows, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("the exported table is no CSV: %v\n%s", err, table)
	}
	return rows
}

// TestWaveB_UnapprovedSaysNotApproved_049_FR008_049C22: submitted activities only: the report says so, their facts held,
// and their goals and projections still count as planning figures.
func TestWaveB_UnapprovedSaysNotApproved_049_FR008_049C22(t *testing.T) {
	t.Parallel()
	alexSees := signIn(t, apitest.New(t, apitest.WithMeasureDemo()), alex)
	revenue, funnel := revenueOf(t, alexSees, "activityStatus=submitted"), funnelOf(t, alexSees, "activityStatus=submitted")
	if revenue.Reason != notApproved || revenue.Cards.Actual.Reason != notApproved || revenue.Cards.Projected.Value == nil {
		t.Errorf("Revenue of submitted activities: reason %q, actual %+v, projected %+v; want %s twice and a projection",
			revenue.Reason, revenue.Cards.Actual, revenue.Cards.Projected, notApproved)
	}
	if funnel.Reason != notApproved || funnel.Cards.Actual.Reason != notApproved || funnel.Cards.Goal.Value == nil {
		t.Errorf("Funnel stages of submitted activities: reason %q, actual %+v, goal %+v; want %s twice and a goal",
			funnel.Reason, funnel.Cards.Actual, funnel.Cards.Goal, notApproved)
	}
}
