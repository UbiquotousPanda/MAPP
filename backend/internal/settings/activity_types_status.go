package settings

import (
	"context"

	"mapp/internal/history"
	"mapp/internal/platform/actor"
)

// SetActivityTypeActive sets the activity type id inactive or reactivates it (FR-004); the same status again changes nothing.
func (s *Service) SetActivityTypeActive(ctx context.Context, a actor.Actor, id string, update StatusUpdate) (ActivityTypeView, error) {
	active, version, statusErr := checkStatus(update)
	if statusErr != nil {
		return ActivityTypeView{}, statusErr
	}
	var view ActivityTypeView
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		t, err := s.storedActivityType(ctx, id)
		if err != nil {
			return err
		}
		if err = t.CheckVersion(version, activityTypeNoun); err != nil {
			return err
		}
		if t.Active != active {
			t.Active = active
			t.Touch(a, s.now())
			if err = s.repo.PutActivityType(ctx, t); err != nil {
				return err
			}
			if err = s.logStatus(ctx, a, activityTypeKind, t.ID, t.Name, active); err != nil {
				return err
			}
		}
		view, err = s.activityTypeView(ctx, t)
		return err
	})
	return view, err
}

// DeleteActivityType moves the type to the recycle bin (FR-004, US5-5); in use — by activities, a model or
// a category (047) — is refused with in_use.
func (s *Service) DeleteActivityType(ctx context.Context, a actor.Actor, id string) (history.BinEntry, error) {
	var entry history.BinEntry
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		t, err := s.storedActivityType(ctx, id)
		if err != nil {
			return err
		}
		u, err := s.usage(ctx)
		if err != nil {
			return err
		}
		if usage := u.activityType(t.ID); usage.InUse {
			return inUseError(t.Name, usage)
		}
		entry, err = s.history.MoveToBin(ctx, a, activityTypeKind, t.ID)
		return err
	})
	return entry, err
}
