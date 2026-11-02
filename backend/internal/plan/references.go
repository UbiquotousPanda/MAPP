package plan

import (
	"context"
	"encoding/json"
	"maps"
	"slices"

	"mapp/internal/platform/actor"
	"mapp/internal/platform/authz"
)

func (s *Service) References(ctx context.Context, a actor.Actor) ([]References, error) {
	var refs []References
	err := s.tx.Read(ctx, func(ctx context.Context) error {
		stored, err := s.repo.List(ctx)
		if err != nil {
			return err
		}
		refs = make([]References, 0, len(stored))
		for _, p := range stored {
			refs = append(refs, referencesOf(p, false))
		}
		bin, err := s.history.ListBin(authz.Unrestricted(ctx), a) // every plan in the bin, whoever asks
		if err != nil {
			return err
		}
		for _, entry := range bin {
			for _, snapshot := range entry.Snapshots {
				if snapshot.Kind != kindName {
					continue
				}
				r, err := ReferencesFromSnapshot(snapshot.Data)
				if err != nil {
					return err
				}
				refs = append(refs, r)
			}
		}
		return nil
	})
	return refs, err
}

func ReferencesFromSnapshot(data json.RawMessage) (References, error) {
	var p Plan
	if err := json.Unmarshal(data, &p); err != nil {
		return References{}, err
	}
	return referencesOf(p, true), nil
}

func referencesOf(p Plan, inBin bool) References {
	p = p.Normalised() // a snapshot of before 016 has no currency
	refs := References{
		PlanID: p.ID, Name: p.Name, ModelID: p.ModelID, GoalStage: p.GoalStage, OwnerID: p.OwnerID, DefaultFinanceBudgetID: p.DefaultFinanceBudgetID,
		TeamIDs: slices.Clone(p.TeamIDs), Attributes: maps.Clone(p.Attributes), InRecycleBin: inBin, Currency: p.Currency,
	}
	if p.Budget != nil {
		budget := *p.Budget
		refs.Budget = &budget
	}
	return refs
}
