package app

import (
	"context"
	"log/slog"
	"time"

	"mapp/internal/platform/actor"
)

// RefreshRates refreshes the simulated GSAP rates on every tick until ctx ends or ticks closes.
func (a *App) RefreshRates(ctx context.Context, ticks <-chan time.Time) {
	for {
		select {
		case <-ctx.Done():
			return
		case _, open := <-ticks:
			if !open {
				return
			}
			if _, err := a.settings.RefreshRates(ctx, actor.System); err != nil {
				slog.WarnContext(ctx, "rate refresh failed", "error", err)
			}
		}
	}
}
