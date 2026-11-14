package projection_test

import (
	"testing"

	"mapp/internal/platform/money"
	"mapp/internal/projection"
)

func TestProject_AGoalOfZeroIsNoGoal_FR013_047C17(t *testing.T) {
	t.Parallel()

	got := projection.Project(inputs(0))

	if got.Present || len(got.Stages) != 0 || len(got.Revenue) != 0 {
		t.Errorf("projection = %+v, want nothing to show: a goal of zero is no goal, never a projected zero", got)
	}
}

func TestProject_ATypedStageOfZeroIsNoGoal_FR009_FR013_047C17(t *testing.T) {
	t.Parallel()
	in := inputs(365_000)
	zero := int64(0)
	none := money.USD(money.Amount{})
	in.Goals = projection.Goals{INQ: in.Goals.INQ, MQL: &zero, Revenue: &none, SetLaterStagesMyself: true}

	got := projection.Project(in)

	if _, found := got.Find(projection.StageINQ); !found {
		t.Errorf("stages = %+v, want INQ's own goal still projected", got.Stages)
	}
	if mql, found := got.Find(projection.StageMQL); found {
		t.Errorf("MQL = %+v, want no series: its typed goal of zero is no goal", mql)
	}
	if len(got.Revenue) != 0 {
		t.Errorf("revenue = %+v, want no series: a revenue goal of zero is no goal", got.Revenue)
	}
}
