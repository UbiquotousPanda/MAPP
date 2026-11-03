package wavebqa_test

import (
	"bytes"
	"net/http"
	"reflect"
	"slices"
	"testing"
	"time"

	"mapp/internal/platform/apitest"
)

func saveModel(t *testing.T, alexSees person, change map[string]any) servedModel {
	t.Helper()
	change["version"] = modelOf(t, alexSees).Version
	return decode[servedModel](t, alexSees.expect(t, patch("/models/"+lubricantsModel, change), http.StatusOK))
}

func tail(months []splitMonth, by int) int64 {
	sum := int64(0)
	for _, m := range months[len(months)-by:] {
		sum += counted(m.Projected, true)
	}
	return sum
}

type shift struct {
	label         string
	before, after []splitMonth
	by            int
}

func (s shift) check(t *testing.T) {
	t.Helper()
	if len(s.before) != 12 || len(s.after) != 12 || s.after[11].Month != "2026-12" {
		t.Fatalf("%s months = %+v, want twelve ending in December", s.label, s.after)
	}
	for i := inProgress + s.by; i < 12; i++ {
		if got, want := counted(s.after[i].Projected, true), counted(s.before[i-s.by].Projected, true); got != want {
			t.Errorf("%s %s = %d, want %d: %s's figure %d months later", s.label, s.after[i].Month, got, want,
				s.before[i-s.by].Month, s.by)
		}
	}
	if got, want := projectedSum(s.after), projectedSum(s.before)-tail(s.before, s.by); got != want {
		t.Errorf("%s from March totals %d, want %d: what lands after December is dropped, not bunched", s.label, got, want)
	}
}

func checkStampMoved(t *testing.T, before, after *stamp, changedAt string) {
	t.Helper()
	if before == nil || after == nil || after.ModelChangedAt != changedAt || before.ModelChangedAt == changedAt {
		t.Errorf("stamp %+v → %+v, want it to move to the model's last change %s", before, after, changedAt)
	}
}

// TestWaveB_ProjectionsRestated_047_SC002: the same read twice is identical; Alex's velocity change restates it.
func TestWaveB_ProjectionsRestated_047_SC002(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	ids := demoIDs(t, alexSees)
	read := func(name string) *apitest.Response {
		return alexSees.expect(t, get("/activities/"+ids[name]+"/performance"), http.StatusOK)
	}
	first := read(helixSecondHalf)
	if again := read(helixSecondHalf); !bytes.Equal(first.Body, again.Body) {
		t.Errorf("two reads differ:\n%s\n%s", first.Body, again.Body)
	}
	server.Advance(time.Hour)
	if later := read(helixSecondHalf); !bytes.Equal(first.Body, later.Body) {
		t.Errorf("an hour later the same day the read differs:\n%s\n%s", first.Body, later.Body)
	}
	before, typed := decode[projectedPanel](t, first), decode[projectedPanel](t, read(helixFirstHalf))

	saved := saveModel(t, alexSees, map[string]any{"inqToMqlVelocityMonths": 1, "mqlToDealVelocityMonths": 2})
	after := decode[projectedPanel](t, read(helixSecondHalf))
	shift{helixSecondHalf + " MQL", before.stage("mql").Months, after.stage("mql").Months, 1}.check(t)
	shift{helixSecondHalf + " revenue", asCounts(before.Revenue.Months), asCounts(after.Revenue.Months), 3}.check(t)
	checkStampMoved(t, before.Projection, after.Projection, saved.UpdatedAt)
	retyped := decode[projectedPanel](t, read(helixFirstHalf))
	if !reflect.DeepEqual(typed.Stages, retyped.Stages) || !reflect.DeepEqual(typed.Revenue, retyped.Revenue) {
		t.Errorf("%s moved with the velocity: %+v, want its typed goals untouched (FR-009)", helixFirstHalf, retyped)
	}
}

type refusal struct {
	Error struct {
		Code     string
		Fields   []struct{ Field string }
		Conflict struct{ ChangedBy string }
	}
}

func (r refusal) fields() []string {
	names := []string{}
	for _, f := range r.Error.Fields {
		names = append(names, f.Field)
	}
	slices.Sort(names)
	return names
}

func checkFaultsTogether(t *testing.T, alexSees person) {
	t.Helper()
	bad := patch("/models/"+lubricantsModel, map[string]any{"inqToMqlVelocityMonths": -1, "mqlToDealVelocityMonths": 25,
		"allowedGoalStages": []string{}, "version": 1})
	bad.opts = []apitest.RequestOption{apitest.SkipRequestValidation()}
	got := decode[refusal](t, alexSees.expect(t, bad, http.StatusBadRequest))
	want := []string{"allowedGoalStages", "inqToMqlVelocityMonths", "mqlToDealVelocityMonths"}
	if got.Error.Code != "validation_failed" || !slices.Equal(got.fields(), want) {
		t.Errorf("velocity -1 and 25 with no stage = %+v, want validation_failed naming %v at once", got, want)
	}
}

func checkSaved(t *testing.T, alexSees person) {
	t.Helper()
	saved := saveModel(t, alexSees, map[string]any{"inqToMqlVelocityMonths": 1, "mqlToDealVelocityMonths": 2})
	if saved.InqToMqlVelocityMonths != 1 || saved.MqlToDealVelocityMonths != 2 || saved.Version != 2 {
		t.Errorf("saved = %+v, want velocities 1 and 2 at version 2", saved)
	}
	stale := patch("/models/"+lubricantsModel, map[string]any{"inqToMqlVelocityMonths": 3, "version": 1})
	got := decode[refusal](t, alexSees.expect(t, stale, http.StatusConflict))
	if got.Error.Code != "version_conflict" || got.Error.Conflict.ChangedBy != "Alex Morgan" {
		t.Errorf("a stale save = %+v, want version_conflict naming Alex Morgan", got)
	}
}

type logEntry struct {
	Actor   struct{ Name string }
	Changes []struct{ NewText string }
}

func checkLogged(t *testing.T, alexSees person) {
	t.Helper()
	log := decode[struct{ Items []logEntry }](t, alexSees.expect(t, get("/activity-log?recordId="+lubricantsModel),
		http.StatusOK))
	if len(log.Items) != 1 || log.Items[0].Actor.Name != "Alex Morgan" || len(log.Items[0].Changes) != 2 ||
		log.Items[0].Changes[0].NewText != "1 month" || log.Items[0].Changes[1].NewText != "2 months" {
		t.Errorf("the model's log = %+v, want one entry by Alex: 1 month and 2 months", log.Items)
	}
}

func measurePlanGoal(t *testing.T, who person) (stage, goal string) {
	t.Helper()
	type plan struct{ ID, Name, GoalStage, GoalAmount string }
	for _, p := range decode[struct{ Items []plan }](t, who.expect(t, get("/plans"), http.StatusOK)).Items {
		if p.Name == measurePlan {
			got := decode[plan](t, who.expect(t, get("/plans/"+p.ID), http.StatusOK))
			return got.GoalStage, got.GoalAmount
		}
	}
	t.Fatalf("%s is not among Alex's plans", measurePlan)
	return "", ""
}

func checkStrandedNamed(t *testing.T, alexSees person) {
	t.Helper()
	check := post("/models/"+lubricantsModel+"/impact", map[string]any{"allowedGoalStages": []string{"mql", "revenue"},
		"version": modelOf(t, alexSees).Version})
	// The answer's kind is outside openapi.yaml's ImpactWarning enum (finding 5): its check is left out here.
	check.opts = []apitest.RequestOption{apitest.SkipValidation()}
	impact := decode[struct{ Warnings []struct{ Kind string } }](t, alexSees.expect(t, check, http.StatusOK))
	if len(impact.Warnings) != 1 || impact.Warnings[0].Kind != "goalStageRemoved" {
		t.Errorf("unticking INQ = %+v, want the plans with an INQ goal named before saving", impact.Warnings)
	}
}

func checkStrandedGoalStands(t *testing.T, alexSees person, activityID string) {
	t.Helper()
	saved := saveModel(t, alexSees, map[string]any{"allowedGoalStages": []string{"mql", "revenue"}})
	stage, goal := measurePlanGoal(t, alexSees)
	inq := projectionOf(t, alexSees, activityID).stage("inq")
	if !slices.Equal(saved.AllowedGoalStages, []string{"mql", "revenue"}) || stage != "inq" || goal != "12000" ||
		inq.Projected == nil || *inq.Projected != 4000 {
		t.Errorf("after unticking INQ: stages %v, plan goal %s %s, projected %v, want the goal kept and projecting",
			saved.AllowedGoalStages, stage, goal, inq.Projected)
	}
}

// TestWaveB_ModelProjectionFields_047_FR001_FR003: faults at once, saved and logged, stale refused, stranded goals kept.
func TestWaveB_ModelProjectionFields_047_FR001_FR003(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	alexSees := signIn(t, server, alex)
	ids := demoIDs(t, alexSees)

	checkFaultsTogether(t, alexSees)
	checkSaved(t, alexSees)
	checkLogged(t, alexSees)
	checkStrandedNamed(t, alexSees)
	checkStrandedGoalStands(t, alexSees, ids[helixSecondHalf])
}
