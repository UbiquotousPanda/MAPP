package history

import (
	"context"

	"mapp/internal/platform/actor"
)

// PurgeHook runs in the purge's Write, so another area can let go of what points at the records deleted for good.
type PurgeHook func(ctx context.Context, a actor.Actor, snapshots []Snapshot) error

func (s *Service) OnPurge(h PurgeHook) {
	s.purgeHooks = append(s.purgeHooks, h)
}

func (s *Service) runPurgeHooks(ctx context.Context, a actor.Actor, snapshots []Snapshot) error {
	for _, h := range s.purgeHooks {
		if err := h(ctx, a, snapshots); err != nil {
			return err
		}
	}
	return nil
}
