package postinvestment

import (
	"context"
	"encoding/json"
	"slices"

	"mapp/internal/history"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/errs"
)

// Kinds returns the history kind of reviews, a child of the activity: deleting an activity takes its review to
// the recycle bin with it, and restoring the activity brings the review back.
func (s *Service) Kinds() []history.Kind {
	return []history.Kind{{
		Name: kindReview, Singular: reviewNoun, Plural: reviewPlural, Parent: kindActivity,
		Snapshot: s.snapshot, ChildIDs: s.repo.IDsOfActivity, Remove: s.repo.Delete, Put: s.put,
		PrepareRestore: s.prepareRestore,
	}}
}

func (s *Service) snapshot(ctx context.Context, id string) (history.Snapshot, bool, error) {
	r, found, err := s.repo.Get(ctx, id)
	if err != nil || !found {
		return history.Snapshot{}, false, err
	}
	data, err := json.Marshal(r)
	if err != nil {
		return history.Snapshot{}, false, err
	}
	name := r.ID
	activities, err := s.activities.InScope(ctx, authz.Scope{Everything: true}, []string{r.ActivityID})
	if err != nil {
		return history.Snapshot{}, false, err
	}
	if act, known := activities[r.ActivityID]; known {
		name = act.Name
	}
	return history.Snapshot{ID: r.ID, Name: name, ParentID: r.ActivityID, Data: data}, true, nil
}

func (s *Service) put(ctx context.Context, snapshot history.Snapshot) error {
	var r Review
	if err := json.Unmarshal(snapshot.Data, &r); err != nil {
		return err
	}
	return s.repo.Insert(ctx, r)
}

// prepareRestore refuses to bring back a review whose activity has since got another one.
func (s *Service) prepareRestore(ctx context.Context, _ history.RestoreContext, snapshot *history.Snapshot) ([]string, error) {
	var r Review
	if err := json.Unmarshal(snapshot.Data, &r); err != nil {
		return nil, err
	}
	existing, err := s.repo.IDsOfActivity(ctx, r.ActivityID)
	if err != nil {
		return nil, err
	}
	if slices.ContainsFunc(existing, func(id string) bool { return id != r.ID }) {
		return nil, errs.CannotRestore(msgUndoTaken)
	}
	return nil, nil
}
