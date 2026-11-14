package activity

import (
	"context"
	"fmt"
	"strings"

	"mapp/internal/platform/errs"
)

const (
	restoreMisfitFormat     = "Can't restore '%s' — %s"
	restoreCurrencyFormat   = "Its planned cost is in %s, but the plan's currency is now %s."
	restoreTypeFormat       = "The model '%s' no longer allows its activity type."
	restoreParentGoneFormat = "its initiative is no longer in a plan."
)

// checkRestoreFits refuses an activity that no longer fits where it comes back, with every reason at once: an
// Undo or a Restore goes through the rules a create or an edit does.
func (s *Service) checkRestoreFits(ctx context.Context, a Activity) error {
	pc, found, err := s.contextOf(ctx, a.InitiativeID)
	if err != nil {
		return err
	}
	if !found {
		return errs.CannotRestore(fmt.Sprintf(restoreMisfitFormat, a.Name, restoreParentGoneFormat))
	}
	problems := restoreProblems(a, pc)
	if len(problems) == 0 {
		return nil
	}
	reasons := make([]string, 0, len(problems))
	for _, p := range problems {
		reasons = append(reasons, p.Message)
	}
	return errs.CannotRestore(fmt.Sprintf(restoreMisfitFormat, a.Name, strings.Join(reasons, " ")))
}

func restoreProblems(a Activity, pc planContext) errs.Problems {
	var problems errs.Problems
	if a.PlannedCost != nil && a.PlannedCost.Currency != pc.plan.Currency {
		problems.Add(fieldPlannedCost, fmt.Sprintf(restoreCurrencyFormat, a.PlannedCost.Currency, pc.plan.Currency))
	}
	checkDates(&problems, a, pc.initiative, latestEndDate(pc.plan.Year))
	if pc.model.ID != "" && a.ActivityTypeID != "" && !pc.model.Allows(a.ActivityTypeID) {
		problems.Add("activityTypeId", fmt.Sprintf(restoreTypeFormat, pc.model.Name))
	}
	return problems
}
