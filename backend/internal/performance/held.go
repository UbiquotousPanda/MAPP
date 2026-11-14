package performance

import (
	"context"
	"fmt"

	"mapp/internal/platform/actor"
)

// Release clears the hold inside the approval's own transaction (research R4); nothing here has a route.
func (s *Service) Release(ctx context.Context, a actor.Actor, activityID string) (int, error) {
	released := 0
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		var releaseErr error
		released, releaseErr = s.repo.ReleaseHeld(ctx, activityID, a, s.now())
		return releaseErr
	})
	if err != nil {
		return 0, fmt.Errorf("release the held facts of %s: %w", activityID, err)
	}
	return released, nil
}

// Hold re-sets the hold when an approved activity leaves Approved again.
func (s *Service) Hold(ctx context.Context, a actor.Actor, activityID string) (int, error) {
	held := 0
	err := s.tx.Write(ctx, func(ctx context.Context) error {
		var holdErr error
		held, holdErr = s.repo.HoldFacts(ctx, activityID, a, s.now())
		return holdErr
	})
	if err != nil {
		return 0, fmt.Errorf("hold the facts of %s: %w", activityID, err)
	}
	return held, nil
}
