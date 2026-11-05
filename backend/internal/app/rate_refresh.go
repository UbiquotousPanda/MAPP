package app

import (
	"context"
	"log/slog"
	"time"

	"mapp/internal/platform/actor"
)

// RefreshRates refreshes the simulated GSAP rates every interval until ctx ends.
func (a *App) RefreshRates(ctx context.Context, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := a.settings.RefreshRates(ctx, actor.System); err != nil {
				slog.WarnContext(ctx, "rate refresh failed", "error", err)
			}
		}
	}
}
