package wavebqa_test

import (
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"

	"mapp/internal/platform/apitest"
)

const (
	retargetingTest = "Retargeting test"
	tellusWebinars  = "Tellus webinar series"
	lubricantsName  = "Lubricants 1.0"
	inProgress      = 2
)

type splitMonth struct {
	Month      string `json:"month"`
	Actual     *int64 `json:"actual"`
	Projected  *int64 `json:"projected"`
	InProgress bool   `json:"inProgress"`
}

func (m splitMonth) String() string {
	return fmt.Sprintf("%s actual %s projected %s in progress %t", m.Month, shown(m.Actual), shown(m.Projected),
		m.InProgress)
}

func shown(v *int64) string {
	if v == nil {
		return "null"
	}
	return strconv.FormatInt(*v, 10)
}

type amount struct{ Amount, Currency string }

type moneyMonth struct {
	Month      string  `json:"month"`
	Actual     *amount `json:"actual"`
	Projected  *amount `json:"projected"`
	InProgress bool    `json:"inProgress"`
}

type projectedStage struct {
	Stage           string       `json:"stage"`
	Goal            *int64       `json:"goal"`
	Actual          *int64       `json:"actual"`
	Projected       *int64       `json:"projected"`
	ProjectedReason string       `json:"projectedReason"`
	Months          []splitMonth `json:"months"`
}

type projectedRevenue struct {
	Goal            *amount      `json:"goal"`
	Actual          *amount      `json:"actual"`
	Projected       *amount      `json:"projected"`
	ProjectedReason string       `json:"projectedReason"`
	Months          []moneyMonth `json:"months"`
}

type stamp struct {
	ModelName      string `json:"modelName"`
	ModelChangedAt string `json:"modelChangedAt"`
}

type projectedPanel struct {
	State      string           `json:"state"`
	Stages     []projectedStage `json:"stages"`
	Revenue    projectedRevenue `json:"revenue"`
	Projection *stamp           `json:"projection"`
}

func (p projectedPanel) stage(name string) projectedStage {
	for _, s := range p.Stages {
		if s.Stage == name {
			return s
		}
	}
	return projectedStage{Stage: name}
}

type servedModel struct {
	Name                    string   `json:"name"`
	InqToMqlVelocityMonths  int      `json:"inqToMqlVelocityMonths"`
	MqlToDealVelocityMonths int      `json:"mqlToDealVelocityMonths"`
	AllowedGoalStages       []string `json:"allowedGoalStages"`
	Version                 int      `json:"version"`
	UpdatedAt               string   `json:"updatedAt"`
}

func modelOf(t *testing.T, who person) servedModel {
	t.Helper()
	return decode[servedModel](t, who.expect(t, get("/models/"+lubricantsModel), http.StatusOK))
}

func projectionOf(t *testing.T, who person, activityID string) projectedPanel {
	t.Helper()
	return decode[projectedPanel](t, who.expect(t, get("/activities/"+activityID+"/performance"), http.StatusOK))
}

// cents reads a served decimal amount, so revenue months add up exactly; -1 marks an amount that is not one.
func cents(a *amount) *int64 {
	if a == nil {
		return nil
	}
	n, err := strconv.ParseInt(strings.Replace(a.Amount, ".", "", 1), 10, 64)
	if err != nil {
		n = -1
	}
	return &n
}

func asCounts(months []moneyMonth) []splitMonth {
	out := make([]splitMonth, 0, len(months))
	for _, m := range months {
		out = append(out, splitMonth{Month: m.Month, Actual: cents(m.Actual), Projected: cents(m.Projected),
			InProgress: m.InProgress})
	}
	return out
}

func negative(v *int64) bool {
	return v != nil && *v < 0
}

type splitCheck struct {
	label     string
	months    []splitMonth
	planYear  *int64
	hasActual bool
}

func monthProblem(i int, m splitMonth, hasActual bool) string {
	wantActual, ahead := i <= inProgress && hasActual, i >= inProgress
	switch want := fmt.Sprintf("2026-%02d", i+1); {
	case m.Month != want:
		return "want " + want + ": twelve months of the plan year, none after December"
	case (m.Actual != nil) != wantActual || (m.Projected != nil) != ahead || m.InProgress != (i == inProgress):
		return "want actual only to March and null without facts, projected from March, March in progress"
	case negative(m.Actual) || negative(m.Projected):
		return "want no negative figure"
	}
	return ""
}

func counted(v *int64, counts bool) int64 {
	if v == nil || !counts {
		return 0
	}
	return *v
}

func checkSplit(t *testing.T, c splitCheck) {
	t.Helper()
	label, months, planYear := c.label, c.months, c.planYear
	if len(months) != 12 || planYear == nil {
		t.Errorf("%s: %d months, projected %v, want twelve and a plan-year figure", label, len(months), planYear)
		return
	}
	sum := int64(0)
	for i, m := range months {
		if problem := monthProblem(i, m, c.hasActual); problem != "" {
			t.Errorf("%s %s, %s", label, m, problem)
		}
		sum += counted(m.Actual, i < inProgress) + counted(m.Projected, i >= inProgress)
	}
	if sum != *planYear {
		t.Errorf("%s projected = %d, want %d: actual to February plus projected from March, nothing twice",
			label, *planYear, sum)
	}
}

func checkProjected(t *testing.T, name string, got projectedPanel, model servedModel) {
	t.Helper()
	if got.State != "ok" || got.Projection == nil || *got.Projection != (stamp{lubricantsName, model.UpdatedAt}) {
		t.Errorf("%s: state %q, stamp %+v, want ok and %s changed %s", name, got.State, got.Projection,
			lubricantsName, model.UpdatedAt)
	}
	for _, s := range got.Stages {
		checkSplit(t, splitCheck{name + " " + s.Stage, s.Months, s.Projected, s.Actual != nil})
		if s.Goal != nil && !slices.Contains(model.AllowedGoalStages, s.Stage) {
			t.Errorf("%s: a goal at %s, which the model's stages %v do not allow", name, s.Stage, model.AllowedGoalStages)
		}
	}
	checkSplit(t, splitCheck{name + " revenue", asCounts(got.Revenue.Months), cents(got.Revenue.Projected),
		got.Revenue.Actual != nil})
}

func checkNoGoal(t *testing.T, name string, got projectedPanel) {
	t.Helper()
	for _, s := range got.Stages {
		if s.Projected != nil || s.ProjectedReason != "noGoal" || len(s.Months) != 0 {
			t.Errorf("%s %s = %+v, want no projection, the reason noGoal and no months, never 0", name, s.Stage, s)
		}
	}
	if !nothingProjected(got.Revenue) || got.Projection != nil {
		t.Errorf("%s revenue = %+v, stamp %+v, want no projection, noGoal, no stamp", name, got.Revenue, got.Projection)
	}
}

func nothingProjected(r projectedRevenue) bool {
	return r.Projected == nil && r.ProjectedReason == "noGoal" && len(r.Months) == 0
}

// TestWaveB_ProjectionShape_047_FR008_FR010: twelve months of 2026 split at today, the plan-year figure, the stamp.
func TestWaveB_ProjectionShape_047_FR008_FR010(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	facts := loadFacts(t, alexSees)
	model := modelOf(t, alexSees)

	for _, name := range []string{helixFirstHalf, helixSecondHalf, tellusWebinars} {
		checkProjected(t, name, projectionOf(t, alexSees, facts.ids[name]), model)
	}
	for _, name := range []string{retargetingTest, tellusCaseStudies} {
		checkNoGoal(t, name, projectionOf(t, alexSees, facts.ids[name]))
	}
	held := projectionOf(t, alexSees, facts.ids[fleetExpo])
	if held.State != "notApproved" || held.Projection != nil || held.Revenue.Projected != nil {
		t.Errorf("%s = %+v, want gated with nothing projected: Submitted", fleetExpo, held)
	}
	inq := projectionOf(t, alexSees, facts.ids[helixFirstHalf]).stage("inq")
	if inq.Projected == nil || *inq.Projected != 400+300+(4000-1242) {
		t.Errorf("%s INQ projected = %v, want 3,458: 700 actual to February and 2,758 of 4,000 from March", helixFirstHalf,
			inq.Projected)
	}
}

func projectedSum(months []splitMonth) int64 {
	sum := int64(0)
	for _, m := range months {
		sum += counted(m.Projected, true)
	}
	return sum
}

func checkAtRate(t *testing.T, inq, mql []splitMonth, rate int64) {
	t.Helper()
	var running, placed int64
	for i := range min(len(inq), len(mql)) {
		running += counted(inq[i].Projected, true)
		share := (running*rate + 50) / 100
		if got := counted(mql[i].Projected, true); got != share-placed {
			t.Errorf("%s MQL %s = %d, want %d: %d %% of the INQ to date rounded half-up, less the months before",
				helixSecondHalf, mql[i].Month, got, share-placed, rate)
		}
		placed = share
	}
}

// TestWaveB_StagesProjectTheirGoals_047_FR007_FR009: typed stages phase their own goals; calculated ones carry remainders.
func TestWaveB_StagesProjectTheirGoals_047_FR007_FR009(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	ids := demoIDs(t, alexSees)

	webinars := projectionOf(t, alexSees, ids[tellusWebinars])
	for stage, goal := range map[string]int64{"inq": 1500, "mql": 300} {
		if got := projectedSum(webinars.stage(stage).Months); got != goal {
			t.Errorf("%s %s months total %d, want its typed goal %d, not the model's rates", tellusWebinars, stage, got, goal)
		}
	}
	if got := projectedSum(asCounts(webinars.Revenue.Months)); got != 120_000_00 {
		t.Errorf("%s revenue months total %d cents, want the typed 120,000.00", tellusWebinars, got)
	}
	second := projectionOf(t, alexSees, ids[helixSecondHalf])
	inq := second.stage("inq").Months
	if got := projectedSum(inq); got != 4000 {
		t.Errorf("%s INQ months total %d, want the whole goal of 4,000 (SC-003)", helixSecondHalf, got)
	}
	checkAtRate(t, inq, second.stage("mql").Months, 2)
	if got := cents(second.Revenue.Projected); got == nil || *got != 40_000_00 {
		t.Errorf("%s revenue projected %v cents, want its 40,000.00 goal: 4 deals, the remainder carried", helixSecondHalf,
			shown(got))
	}
}
