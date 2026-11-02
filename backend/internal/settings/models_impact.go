package settings

import (
	"context"
	"fmt"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/errs"
)

// ModelImpact checks the body as UpdateModel does, except the version, and saves nothing.
func (s *Service) ModelImpact(ctx context.Context, _ actor.Actor, id string, update ModelUpdate) (ChangeImpact, error) {
	impact := ChangeImpact{Warnings: []ImpactWarning{}}
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		m, err := s.storedModel(ctx, id)
		if err != nil {
			return err
		}
		var problems errs.Problems
		changed, err := s.applyModel(ctx, m, update, &problems)
		if err != nil {
			return err
		}
		if err = problems.Err(); err != nil {
			return err
		}
		refs, err := s.references(ctx)
		if err != nil {
			return err
		}
		plans, activities := modelInUse(refs, m.ID)
		if goalsChange(m, changed) && len(plans) > 0 {
			impact.Warnings = append(impact.Warnings, ImpactWarning{
				Kind:    ImpactGoalsRecalculated,
				Message: fmt.Sprintf(goalsRecalculatedMessage, plural(len(plans), "plan", "plans"), plural(activities, "activity", "activities")),
				Count:   len(plans),
			})
		}
		removed := filter(m.ActivityTypeIDs, func(typeID string) bool { return !slices.Contains(changed.ActivityTypeIDs, typeID) })
		warnings, err := s.typeRemovedWarnings(ctx, removed, refs, plans)
		impact.Warnings = append(impact.Warnings, warnings...)
		impact.Warnings = append(impact.Warnings, stageRemovedWarnings(m, changed, refs)...)
		return err
	})
	return impact, err
}

func (s *Service) typeRemovedWarnings(ctx context.Context, typeIDs []string, refs []Reference, plans map[string]bool) ([]ImpactWarning, error) {
	warnings := []ImpactWarning{}
	for _, typeID := range typeIDs {
		n := liveActivitiesOfType(refs, typeID, plans)
		if n == 0 {
			continue
		}
		t, _, err := s.repo.GetActivityType(ctx, typeID)
		if err != nil {
			return nil, err
		}
		message := fmt.Sprintf(typeRemovedMessage, plural(n, "activity", "activities"), t.Name)
		if n == 1 {
			message = fmt.Sprintf(typeRemovedOneMessage, t.Name)
		}
		warnings = append(warnings, ImpactWarning{Kind: ImpactActivityTypeRemoved, Message: message, Count: n})
	}
	return warnings, nil
}

func goalsChange(before, after Model) bool {
	return before.InqToMqlRate != after.InqToMqlRate || before.MqlToDealRate != after.MqlToDealRate ||
		before.AverageDealSize != after.AverageDealSize
}

// modelInUse counts live records only: records in the recycle bin are recalculated when they come back.
func modelInUse(refs []Reference, modelID string) (plans map[string]bool, activities int) {
	plans = map[string]bool{}
	for _, ref := range refs {
		if !ref.InBin && ref.Level == LevelPlan && ref.ModelID == modelID {
			plans[ref.PlanID] = true
		}
	}
	for _, ref := range refs {
		if !ref.InBin && ref.Level == LevelActivity && plans[ref.PlanID] {
			activities++
		}
	}
	return plans, activities
}

func liveActivitiesOfType(refs []Reference, typeID string, plans map[string]bool) int {
	n := 0
	for _, ref := range refs {
		if !ref.InBin && ref.Level == LevelActivity && ref.ActivityTypeID == typeID && plans[ref.PlanID] {
			n++
		}
	}
	return n
}
