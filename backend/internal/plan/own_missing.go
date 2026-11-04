package plan

import (
	"context"

	"mapp/internal/platform/actor"
	"mapp/internal/settings"
)

// OwnMissing counts the needed-to-publish fields each plan of year leaves empty itself, as the Plans list shows them.
// It skips the roll-ups of the levels below that List also builds, which at volume take seconds a report never uses.
func (s *Service) OwnMissing(ctx context.Context, a actor.Actor, year int) (map[string]int, error) {
	out := map[string]int{}
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		scoped, err := s.inScope(ctx, a, ScopeAll)
		if err != nil {
			return err
		}
		plans := ListFilter{Year: &year}.plansInRange(scoped)
		l, err := s.lookupsFor(ctx, plans)
		if err != nil {
			return err
		}
		for _, p := range plans {
			unitIDs, err := s.settings.BusinessUnit(ctx, p.Attributes)
			if err != nil {
				return err
			}
			missing, err := s.ownMissingOf(ctx, p, ownerFits(p, l), unitIDs)
			if err != nil {
				return err
			}
			out[p.ID] = len(missing)
		}
		return nil
	})
	return out, err
}

func (s *Service) ownMissingOf(ctx context.Context, p Plan, ownerOK bool, unitIDs []string) ([]settings.MissingField, error) {
	attributes, err := s.settings.MissingAttributes(ctx, settings.LevelPlan, p.Attributes, unitIDs)
	if err != nil {
		return nil, err
	}
	return ownMissing(p, ownerOK, attributes), nil
}

func ownerFits(p Plan, l lookups) bool {
	return p.OwnerID != "" && ownerEligible(p.OwnerID, p.TeamIDs, l.members)
}
