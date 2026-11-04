package performance

import (
	"testing"

	"mapp/internal/platform/money"
)

// A supplied figure with nothing counted says why: no goal for a goal of zero exactly as for none at all.
func TestEmptyFigureReason_AGoalOfZeroIsNoGoal_FR013_047C17(t *testing.T) {
	t.Parallel()
	zero := int64(0)
	none := money.USD(money.Amount{})
	suppliers := []Supplier{{Meaning: MeaningStage, Stage: "inq"}, {Meaning: MeaningRevenue}}

	if got := stageReason(StageFigure{Stage: "inq", Goal: &zero}, "inq", suppliers, troubleWords{}); got != reasonNoGoal {
		t.Errorf("INQ reason with a goal of zero = %q, want %q", got, reasonNoGoal)
	}
	if got := revenueReason(RevenueFigure{Goal: &none}, suppliers, troubleWords{}); got != reasonNoGoal {
		t.Errorf("revenue reason with a goal of zero = %q, want %q", got, reasonNoGoal)
	}
}
